import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, count, avg, sum } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users, userPreferences, studyStreaks, lessonProgress,
  enrollments, srCards, quizAttempts, downloadManifests,
} from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { Errors } from '../lib/errors.js';
import { getOrSet, invalidate } from '../lib/cache.js';
import { adminQueue } from '../lib/queues.js';

function uid(req: FastifyRequest): string {
  const u = (req as FastifyRequest & { userId?: string }).userId;
  if (!u) throw Errors.unauthorized();
  return u;
}

function respond<T>(reply: FastifyReply, data: T, status = 200, reqId: string) {
  return reply.code(status).send({ data, meta: { request_id: reqId, timestamp: new Date().toISOString() } });
}

const ProfileUpdateBody = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl:   z.string().url().optional(),
});

const PreferencesUpdateBody = z.object({
  primaryLanguage:      z.string().optional(),
  lessonLanguages:      z.array(z.string()).optional(),
  hasReliableInternet:  z.boolean().optional(),
  deviceType:           z.enum(['smartphone', 'tablet', 'laptop']).optional(),
  lowBandwidthDefault:  z.boolean().optional(),
  autoDownloadWifi:     z.boolean().optional(),
  dailyStudyMinutes:    z.number().int().min(5).max(480).optional(),
  preferredTechniques:  z.array(z.string()).optional(),
  notificationsEnabled: z.boolean().optional(),
  timezone:             z.string().optional(),
});

export async function usersRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /users/me
  fastify.get('/users/me', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const [user, prefs, streak] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, userId) }),
      db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }),
      db.query.studyStreaks.findFirst({ where: eq(studyStreaks.userId, userId) }),
    ]);
    if (!user) throw Errors.notFound('User');
    const { passwordHash: _, ...safeUser } = user;
    return respond(reply, { user: safeUser, preferences: prefs, streak }, 200, req.id);
  });

  // PATCH /users/me
  fastify.patch<{ Body: z.infer<typeof ProfileUpdateBody> }>(
    '/users/me',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = ProfileUpdateBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.data.displayName !== undefined) updates['displayName'] = body.data.displayName;
      if (body.data.avatarUrl !== undefined)   updates['avatarUrl']   = body.data.avatarUrl;

      const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
      if (!updated) throw Errors.notFound('User');
      const { passwordHash: _, ...safeUser } = updated;
      return respond(reply, safeUser, 200, req.id);
    },
  );

  // DELETE /users/me
  fastify.delete('/users/me', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    await db.update(users).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
    await adminQueue.add('purge-user-data', { user_id: userId, purge_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
    return respond(reply, { deleted: true, purge_scheduled: true }, 200, req.id);
  });

  // GET /users/me/preferences
  fastify.get('/users/me/preferences', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const prefs  = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) });
    if (!prefs) throw Errors.notFound('Preferences');
    return respond(reply, prefs, 200, req.id);
  });

  // PATCH /users/me/preferences
  fastify.patch<{ Body: z.infer<typeof PreferencesUpdateBody> }>(
    '/users/me/preferences',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = PreferencesUpdateBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const d = body.data;
      if (d.primaryLanguage !== undefined)      updates['primaryLanguage']      = d.primaryLanguage;
      if (d.lessonLanguages !== undefined)       updates['lessonLanguages']       = d.lessonLanguages;
      if (d.hasReliableInternet !== undefined)   updates['hasReliableInternet']   = d.hasReliableInternet;
      if (d.deviceType !== undefined)            updates['deviceType']            = d.deviceType;
      if (d.lowBandwidthDefault !== undefined)   updates['lowBandwidthDefault']   = d.lowBandwidthDefault;
      if (d.autoDownloadWifi !== undefined)      updates['autoDownloadWifi']      = d.autoDownloadWifi;
      if (d.dailyStudyMinutes !== undefined)     updates['dailyStudyMinutes']     = d.dailyStudyMinutes;
      if (d.preferredTechniques !== undefined)   updates['preferredTechniques']   = d.preferredTechniques;
      if (d.notificationsEnabled !== undefined)  updates['notificationsEnabled']  = d.notificationsEnabled;
      if (d.timezone !== undefined)              updates['timezone']              = d.timezone;

      await db.update(userPreferences).set(updates).where(eq(userPreferences.userId, userId));

      // Bust cached daily plan
      const today = new Date().toISOString().split('T')[0] ?? '';
      await invalidate(`cache:daily_plan:${userId}:${today}`);

      const updated = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) });
      return respond(reply, updated, 200, req.id);
    },
  );

  // GET /users/me/stats
  fastify.get('/users/me/stats', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const stats  = await getOrSet(`cache:user_stats:${userId}`, 300, async () => {
      const [completedRows] = await db
        .select({ count: count() })
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.status, 'completed')));

      const [enrolledRows] = await db
        .select({ count: count() })
        .from(enrollments)
        .where(eq(enrollments.userId, userId));

      const streak = await db.query.studyStreaks.findFirst({ where: eq(studyStreaks.userId, userId) });

      const [timeRows] = await db
        .select({ total: sum(lessonProgress.timeSpentSec) })
        .from(lessonProgress)
        .where(eq(lessonProgress.userId, userId));

      const [srRows] = await db
        .select({ count: count() })
        .from(srCards)
        .where(eq(srCards.userId, userId));

      const [quizRows] = await db
        .select({ avgScore: avg(quizAttempts.score) })
        .from(quizAttempts)
        .where(eq(quizAttempts.userId, userId));

      return {
        lessons_completed:    completedRows?.count ?? 0,
        courses_enrolled:     enrolledRows?.count ?? 0,
        current_streak:       streak?.currentStreak ?? 0,
        longest_streak:       streak?.longestStreak ?? 0,
        total_study_minutes:  Math.round(((timeRows?.total as number | null) ?? 0) / 60),
        sr_cards_reviewed:    srRows?.count ?? 0,
        quiz_average_score:   Math.round(((quizRows?.avgScore as number | null) ?? 0) * 100) / 100,
      };
    });

    return respond(reply, stats, 200, req.id);
  });

  // GET /users/me/downloads
  fastify.get<{ Querystring: { device_id?: string } }>(
    '/users/me/downloads',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId   = uid(req);
      const deviceId = req.query.device_id;

      const conditions = deviceId
        ? and(eq(downloadManifests.userId, userId), eq(downloadManifests.deviceId, deviceId))
        : eq(downloadManifests.userId, userId);

      const manifests = await db.select().from(downloadManifests).where(conditions);
      return respond(reply, manifests, 200, req.id);
    },
  );
}
