import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, sql, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { resources, teacherPacks, communityNotebooks } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { Errors } from '../lib/errors.js';
import { presignGet, mediaBucket } from '../lib/minio.js';
import { adminQueue } from '../lib/queues.js';

function uid(req: FastifyRequest): string {
  const u = (req as FastifyRequest & { userId?: string }).userId;
  if (!u) throw Errors.unauthorized();
  return u;
}

function respond<T>(reply: FastifyReply, data: T, status = 200, reqId: string) {
  return reply.code(status).send({ data, meta: { request_id: reqId, timestamp: new Date().toISOString() } });
}

const TeacherPackBody = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  languages:   z.array(z.string()).default([]),
  subjects:    z.array(z.string()).default([]),
  bundle_url:  z.string().min(1),
  size_bytes:  z.number().int().optional(),
});

export async function communityRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /resources
  fastify.get<{
    Querystring: {
      type?: string;
      language?: string;
      subject?: string;
      lat?: string;
      lng?: string;
      radius_km?: string;
    }
  }>('/resources', async (req, reply) => {
    const { type, language, subject, lat, lng, radius_km } = req.query;

    let rows = await db.select().from(resources).where(eq(resources.verified, true));

    if (type) rows = rows.filter(r => r.type === type);
    if (language) rows = rows.filter(r => r.languages.includes(language));
    if (subject) rows = rows.filter(r => r.subjects.includes(subject) || r.subjects.includes('all'));

    if (lat && lng && radius_km) {
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      const radN = parseFloat(radius_km);

      rows = rows.filter(r => {
        if (r.lat === null || r.lng === null) return false;
        const dist =
          3958.8 *
          Math.acos(
            Math.cos((latN * Math.PI) / 180) *
            Math.cos((r.lat! * Math.PI) / 180) *
            Math.cos(((r.lng! - lngN) * Math.PI) / 180) +
            Math.sin((latN * Math.PI) / 180) * Math.sin((r.lat! * Math.PI) / 180),
          );
        return dist <= radN * 0.621371; // km to miles
      });
    }

    return respond(reply, rows, 200, req.id);
  });

  // GET /resources/:id
  fastify.get<{ Params: { id: string } }>('/resources/:id', async (req, reply) => {
    const row = await db.query.resources.findFirst({ where: eq(resources.id, req.params.id) });
    if (!row) throw Errors.notFound('Resource');
    return respond(reply, row, 200, req.id);
  });

  // GET /teacher-packs
  fastify.get<{
    Querystring: { language?: string; subject?: string; cursor?: string; limit?: string }
  }>('/teacher-packs', async (req, reply) => {
    const { language, subject, cursor, limit: limitStr } = req.query;
    const limit  = Math.min(parseInt(limitStr ?? '20'), 100);
    const offset = cursor ? parseInt(atob(cursor)) : 0;

    let rows = await db
      .select()
      .from(teacherPacks)
      .where(eq(teacherPacks.approved, true))
      .limit(limit + 1)
      .offset(offset);

    if (language) rows = rows.filter(p => p.languages.includes(language));
    if (subject)  rows = rows.filter(p => p.subjects.includes(subject));

    const hasMore   = rows.length > limit;
    const items     = rows.slice(0, limit);
    const nextOffset = offset + limit;

    return respond(reply, {
      items,
      next_cursor: hasMore ? btoa(String(nextOffset)) : null,
      has_more:    hasMore,
    }, 200, req.id);
  });

  // GET /teacher-packs/:id
  fastify.get<{ Params: { id: string } }>('/teacher-packs/:id', async (req, reply) => {
    const pack = await db.query.teacherPacks.findFirst({ where: eq(teacherPacks.id, req.params.id) });
    if (!pack) throw Errors.notFound('Teacher pack');
    return respond(reply, pack, 200, req.id);
  });

  // GET /teacher-packs/:id/download
  fastify.get<{ Params: { id: string } }>('/teacher-packs/:id/download', async (req, reply) => {
    const pack = await db.query.teacherPacks.findFirst({
      where: and(eq(teacherPacks.id, req.params.id), eq(teacherPacks.approved, true)),
    });
    if (!pack) throw Errors.notFound('Teacher pack');

    await db.update(teacherPacks)
      .set({ downloads: pack.downloads + 1 })
      .where(eq(teacherPacks.id, pack.id));

    // Bundle URL stored directly — return it (or generate presigned if stored in MinIO)
    return respond(reply, { url: pack.bundleUrl, downloads: pack.downloads + 1 }, 200, req.id);
  });

  // POST /teacher-packs
  fastify.post<{ Body: z.infer<typeof TeacherPackBody> }>(
    '/teacher-packs',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = TeacherPackBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const [pack] = await db.insert(teacherPacks).values({
        authorId:    userId ?? null,
        title:       body.data.title,
        description: body.data.description ?? null,
        languages:   body.data.languages,
        subjects:    body.data.subjects,
        bundleUrl:   body.data.bundle_url,
        sizeBytes:   body.data.size_bytes ?? null,
        approved:    false,
      }).returning();

      await adminQueue.add('approve-pack', { pack_id: pack?.id });

      return respond(reply, pack, 201, req.id);
    },
  );

  // POST /community/notebooks
  const NotebookBody = z.object({
    title:   z.string().min(1).max(200),
    body:    z.string().min(1).max(10_000),
    subject: z.string().min(1).max(50).default('general'),
  });

  fastify.post('/notebooks', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const parsed = NotebookBody.safeParse(req.body);
    if (!parsed.success) throw Errors.validation(parsed.error.issues[0]?.message ?? 'Invalid input');

    const [notebook] = await db.insert(communityNotebooks).values({
      userId,
      title:   parsed.data.title,
      body:    parsed.data.body,
      subject: parsed.data.subject,
    }).returning();

    return respond(reply, notebook, 201, req.id);
  });

  // GET /community/notebooks
  fastify.get('/notebooks', { preHandler: [authenticate] }, async (req, reply) => {
    const notebooks = await db.select().from(communityNotebooks)
      .orderBy(communityNotebooks.createdAt)
      .limit(50);
    return respond(reply, notebooks, 200, req.id);
  });
}
