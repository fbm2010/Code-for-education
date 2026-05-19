import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, ilike, or, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  categories, courses, lessons, lessonContent, mediaAssets,
  teacherPacks, users, syncRecords,
} from '../db/schema.js';
import { isAdmin } from '../middleware/isAdmin.js';
import { Errors } from '../lib/errors.js';
import { presignPut, mediaBucket } from '../lib/minio.js';
import { bundleQueue, mediaQueue } from '../lib/queues.js';
import { invalidatePattern } from '../lib/cache.js';

function respond<T>(reply: FastifyReply, data: T, status = 200, reqId: string) {
  return reply.code(status).send({ data, meta: { request_id: reqId, timestamp: new Date().toISOString() } });
}

const CategoryBody = z.object({
  slug:        z.string().min(1),
  name:        z.record(z.string()),
  description: z.record(z.string()).optional(),
  icon:        z.string().optional(),
  sortOrder:   z.number().int().default(0),
});

const CourseBody = z.object({
  category_id:       z.string().uuid(),
  slug:              z.string().min(1),
  title:             z.record(z.string()),
  description:       z.record(z.string()).optional(),
  cover_image:       z.string().optional(),
  difficulty:        z.enum(['beginner', 'intermediate', 'advanced']),
  estimated_minutes: z.number().int().optional(),
  tags:              z.array(z.string()).default([]),
  published:         z.boolean().default(false),
});

const LessonBody = z.object({
  course_id:         z.string().uuid(),
  slug:              z.string().min(1),
  title:             z.record(z.string()),
  sort_order:        z.number().int().default(0),
  estimated_minutes: z.number().int().optional(),
  content_type:      z.enum(['text', 'video', 'audio', 'mixed']),
  published:         z.boolean().default(false),
});

const LessonContentBody = z.object({
  body_html:  z.string().optional(),
  body_text:  z.string().optional(),
  audio_url:  z.string().optional(),
  slides_url: z.string().optional(),
  version:    z.number().int().default(1),
  published:  z.boolean().default(false),
});

const MediaUploadBody = z.object({
  filename:  z.string().min(1),
  mime_type: z.string().min(1),
  lesson_id: z.string().uuid().optional(),
});

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // All admin routes require admin role
  fastify.addHook('preHandler', isAdmin);

  // POST /admin/categories
  fastify.post<{ Body: z.infer<typeof CategoryBody> }>('/categories', async (req, reply) => {
    const body = CategoryBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

    const [cat] = await db.insert(categories).values({
      slug:        body.data.slug,
      name:        body.data.name,
      description: body.data.description ?? null,
      icon:        body.data.icon ?? null,
      sortOrder:   body.data.sortOrder,
    }).returning();

    return respond(reply, cat, 201, req.id);
  });

  // POST /admin/courses
  fastify.post<{ Body: z.infer<typeof CourseBody> }>('/courses', async (req, reply) => {
    const body = CourseBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

    const [course] = await db.insert(courses).values({
      categoryId:       body.data.category_id,
      slug:             body.data.slug,
      title:            body.data.title,
      description:      body.data.description ?? null,
      coverImage:       body.data.cover_image ?? null,
      difficulty:       body.data.difficulty,
      estimatedMinutes: body.data.estimated_minutes ?? null,
      tags:             body.data.tags,
      published:        body.data.published,
    }).returning();

    return respond(reply, course, 201, req.id);
  });

  // PATCH /admin/courses/:id
  fastify.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof CourseBody>> }>(
    '/courses/:id',
    async (req, reply) => {
      const { id } = req.params;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const b = req.body as Partial<z.infer<typeof CourseBody>>;
      if (b.title !== undefined)             updates['title']            = b.title;
      if (b.description !== undefined)       updates['description']      = b.description;
      if (b.difficulty !== undefined)        updates['difficulty']       = b.difficulty;
      if (b.estimated_minutes !== undefined) updates['estimatedMinutes'] = b.estimated_minutes;
      if (b.tags !== undefined)              updates['tags']             = b.tags;
      if (b.published !== undefined)         updates['published']        = b.published;

      const [updated] = await db.update(courses).set(updates).where(eq(courses.id, id)).returning();
      if (!updated) throw Errors.notFound('Course');
      return respond(reply, updated, 200, req.id);
    },
  );

  // POST /admin/lessons
  fastify.post<{ Body: z.infer<typeof LessonBody> }>('/lessons', async (req, reply) => {
    const body = LessonBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

    const [lesson] = await db.insert(lessons).values({
      courseId:         body.data.course_id,
      slug:             body.data.slug,
      title:            body.data.title,
      sortOrder:        body.data.sort_order,
      estimatedMinutes: body.data.estimated_minutes ?? null,
      contentType:      body.data.content_type,
      published:        body.data.published,
    }).returning();

    return respond(reply, lesson, 201, req.id);
  });

  // PATCH /admin/lessons/:id
  fastify.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof LessonBody>> }>(
    '/lessons/:id',
    async (req, reply) => {
      const { id } = req.params;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const b = req.body as Partial<z.infer<typeof LessonBody>>;
      if (b.title !== undefined)             updates['title']            = b.title;
      if (b.sort_order !== undefined)        updates['sortOrder']        = b.sort_order;
      if (b.estimated_minutes !== undefined) updates['estimatedMinutes'] = b.estimated_minutes;
      if (b.content_type !== undefined)      updates['contentType']      = b.content_type;
      if (b.published !== undefined)         updates['published']        = b.published;

      const [updated] = await db.update(lessons).set(updates).where(eq(lessons.id, id)).returning();
      if (!updated) throw Errors.notFound('Lesson');

      // Bust cache
      await invalidatePattern(`cache:lesson:${id}*`);
      return respond(reply, updated, 200, req.id);
    },
  );

  // POST /admin/lessons/:id/content/:lang
  fastify.post<{ Params: { id: string; lang: string }; Body: z.infer<typeof LessonContentBody> }>(
    '/lessons/:id/content/:lang',
    async (req, reply) => {
      const { id, lang } = req.params;
      const body = LessonContentBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const existing = await db.query.lessonContent.findFirst({
        where: and(eq(lessonContent.lessonId, id), eq(lessonContent.language, lang)),
      });

      let saved;
      if (existing) {
        const [row] = await db.update(lessonContent).set({
          bodyHtml:  body.data.body_html ?? null,
          bodyText:  body.data.body_text ?? null,
          audioUrl:  body.data.audio_url ?? null,
          slidesUrl: body.data.slides_url ?? null,
          version:   body.data.version,
          published: body.data.published,
        }).where(and(eq(lessonContent.lessonId, id), eq(lessonContent.language, lang))).returning();
        saved = row;
      } else {
        const [row] = await db.insert(lessonContent).values({
          lessonId:  id,
          language:  lang,
          bodyHtml:  body.data.body_html ?? null,
          bodyText:  body.data.body_text ?? null,
          audioUrl:  body.data.audio_url ?? null,
          slidesUrl: body.data.slides_url ?? null,
          version:   body.data.version,
          published: body.data.published,
        }).returning();
        saved = row;
      }

      // Enqueue bundle regeneration
      await bundleQueue.add('generate-bundle', { lesson_id: id, language: lang });

      // Bust cache
      await invalidatePattern(`cache:lesson_content:${id}:${lang}:*`);
      await invalidatePattern(`cache:lesson:${id}*`);

      return respond(reply, saved, saved ? 200 : 201, req.id);
    },
  );

  // POST /admin/media/upload
  fastify.post<{ Body: z.infer<typeof MediaUploadBody> }>('/media/upload', async (req, reply) => {
    const body = MediaUploadBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

    const [asset] = await db.insert(mediaAssets).values({
      lessonId:   body.data.lesson_id ?? null,
      filename:   body.data.filename,
      mimeType:   body.data.mime_type,
      storageKey: `uploads/${Date.now()}-${body.data.filename}`,
    }).returning();

    if (!asset) throw Errors.internal();

    const uploadUrl = await presignPut(mediaBucket(), asset.storageKey);
    return respond(reply, { asset_id: asset.id, upload_url: uploadUrl, storage_key: asset.storageKey }, 200, req.id);
  });

  // POST /admin/media/:id/process
  fastify.post<{ Params: { id: string } }>('/media/:id/process', async (req, reply) => {
    const asset = await db.query.mediaAssets.findFirst({ where: eq(mediaAssets.id, req.params.id) });
    if (!asset) throw Errors.notFound('Media asset');

    await mediaQueue.add('compress-images', {
      asset_id:    asset.id,
      storage_key: asset.storageKey,
      mime_type:   asset.mimeType,
    });

    return respond(reply, { queued: true, asset_id: asset.id }, 202, req.id);
  });

  // POST /admin/teacher-packs/:id/approve
  fastify.post<{ Params: { id: string } }>('/teacher-packs/:id/approve', async (req, reply) => {
    const [updated] = await db.update(teacherPacks)
      .set({ approved: true })
      .where(eq(teacherPacks.id, req.params.id))
      .returning();
    if (!updated) throw Errors.notFound('Teacher pack');
    return respond(reply, updated, 200, req.id);
  });

  // GET /admin/users
  fastify.get<{ Querystring: { q?: string; cursor?: string; limit?: string } }>(
    '/users',
    async (req, reply) => {
      const { q, cursor, limit: limitStr } = req.query;
      const limit  = Math.min(parseInt(limitStr ?? '20'), 100);
      const offset = cursor ? parseInt(atob(cursor)) : 0;

      const condition = q
        ? or(ilike(users.email, `%${q}%`), ilike(users.username, `%${q}%`))
        : undefined;

      const rows = await db
        .select({ id: users.id, email: users.email, username: users.username, displayName: users.displayName, role: users.role, createdAt: users.createdAt, isGuest: users.isGuest })
        .from(users)
        .where(condition)
        .orderBy(desc(users.createdAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore   = rows.length > limit;
      const items     = rows.slice(0, limit);
      const nextOffset = offset + limit;

      return respond(reply, { items, next_cursor: hasMore ? btoa(String(nextOffset)) : null, has_more: hasMore }, 200, req.id);
    },
  );

  // GET /admin/sync/conflicts
  fastify.get<{ Querystring: { cursor?: string; limit?: string } }>(
    '/sync/conflicts',
    async (req, reply) => {
      const limit  = Math.min(parseInt(req.query.limit ?? '50'), 200);
      const offset = req.query.cursor ? parseInt(atob(req.query.cursor)) : 0;

      const recent = await db
        .select()
        .from(syncRecords)
        .orderBy(desc(syncRecords.syncedAt))
        .limit(limit)
        .offset(offset);

      return respond(reply, recent, 200, req.id);
    },
  );
}
