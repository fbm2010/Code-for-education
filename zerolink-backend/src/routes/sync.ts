import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { downloadManifests } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { Errors } from '../lib/errors.js';
import { processSyncPush, pullChanges } from '../services/syncService.js';

function uid(req: FastifyRequest): string {
  const u = (req as FastifyRequest & { userId?: string }).userId;
  if (!u) throw Errors.unauthorized();
  return u;
}

function respond<T>(reply: FastifyReply, data: T, status = 200, reqId: string) {
  return reply.code(status).send({ data, meta: { request_id: reqId, timestamp: new Date().toISOString() } });
}

const SyncRecordSchema = z.object({
  table:            z.string(),
  record_id:        z.string().uuid(),
  operation:        z.enum(['insert', 'update', 'delete']),
  payload:          z.record(z.unknown()),
  client_timestamp: z.string().datetime(),
});

const SyncPushBody = z.object({
  device_id: z.string().min(1),
  records:   z.array(SyncRecordSchema),
});

export async function syncRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /sync/push
  fastify.post<{ Body: z.infer<typeof SyncPushBody> }>(
    '/sync/push',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = SyncPushBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const result = await processSyncPush(
        userId,
        body.data.device_id,
        body.data.records.map(r => ({
          table:            r.table,
          record_id:        r.record_id,
          operation:        r.operation,
          payload:          r.payload as Record<string, unknown>,
          client_timestamp: r.client_timestamp,
        })),
        db,
      );

      return respond(reply, result, 200, req.id);
    },
  );

  // GET /sync/pull
  fastify.get<{
    Querystring: { device_id?: string; since?: string; tables?: string }
  }>(
    '/sync/pull',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const { since, tables: tablesStr } = req.query;

      const sinceDate  = since ? new Date(since) : new Date(0);
      const tables     = tablesStr ? tablesStr.split(',').map(t => t.trim()) : ['lesson_progress', 'sr_cards'];

      const changes = await pullChanges(userId, sinceDate, tables, db);

      return respond(reply, { changes, server_timestamp: new Date().toISOString() }, 200, req.id);
    },
  );

  // GET /sync/manifest
  fastify.get<{ Querystring: { device_id?: string } }>(
    '/sync/manifest',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId   = uid(req);
      const deviceId = req.query.device_id ?? 'default';

      const manifests = await db
        .select()
        .from(downloadManifests)
        .where(and(eq(downloadManifests.userId, userId), eq(downloadManifests.deviceId, deviceId)));

      return respond(reply, manifests, 200, req.id);
    },
  );

  // POST /sync/manifest
  fastify.post<{
    Body: { device_id: string; lesson_id: string; language: string; version: number }
  }>(
    '/sync/manifest',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = z.object({
        device_id: z.string(),
        lesson_id: z.string().uuid(),
        language:  z.string(),
        version:   z.number().int(),
      }).safeParse(req.body);

      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      await db
        .insert(downloadManifests)
        .values({
          userId,
          deviceId:    body.data.device_id,
          lessonId:    body.data.lesson_id,
          language:    body.data.language,
          version:     body.data.version,
          downloadedAt: new Date(),
        })
        .onConflictDoNothing();

      return respond(reply, { recorded: true }, 201, req.id);
    },
  );

  // DELETE /sync/manifest/:lesson_id
  fastify.delete<{ Params: { lesson_id: string }; Querystring: { device_id?: string } }>(
    '/sync/manifest/:lesson_id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId   = uid(req);
      const deviceId = req.query.device_id ?? 'default';

      await db
        .delete(downloadManifests)
        .where(
          and(
            eq(downloadManifests.userId, userId),
            eq(downloadManifests.deviceId, deviceId),
            eq(downloadManifests.lessonId, req.params.lesson_id),
          ),
        );

      return respond(reply, { deleted: true }, 200, req.id);
    },
  );
}
