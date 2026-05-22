import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  lessonProgress, srCards, quizzes, quizAttempts, studyStreaks,
  userPreferences, dailyPlans,
} from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { Errors } from '../lib/errors.js';
import { sm2Update } from '../services/sm2.js';
import { recordStudySession, logStudyEvent } from '../services/streakService.js';
import { generateDailyPlan } from '../services/studyCoach.js';
import { redis } from '../lib/redis.js';
import { invalidate } from '../lib/cache.js';

function uid(req: FastifyRequest): string {
  const u = (req as FastifyRequest & { userId?: string }).userId;
  if (!u) throw Errors.unauthorized();
  return u;
}

function respond<T>(reply: FastifyReply, data: T, status = 200, reqId: string) {
  return reply.code(status).send({ data, meta: { request_id: reqId, timestamp: new Date().toISOString() } });
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

const ProgressBody = z.object({
  status:          z.enum(['not_started', 'in_progress', 'completed']).optional(),
  percent_complete: z.number().int().min(0).max(100).optional(),
  time_spent_sec:  z.number().int().min(0).optional(),
  study_technique: z.string().optional(),
});

const SrReviewBody = z.object({ quality: z.number().int().min(0).max(5) });

const SrCardBody = z.object({
  lesson_id: z.string().uuid().optional(),
  term: z.object({ front: z.string(), back: z.string(), language: z.string() }),
});

const QuizAttemptBody = z.object({
  quiz_id:     z.string().uuid(),
  lesson_id:   z.string().uuid().optional(),
  answers:     z.record(z.string()),
  duration_sec: z.number().int().optional(),
});

export async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /progress
  fastify.get('/progress', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const progress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
    return respond(reply, progress, 200, req.id);
  });

  // GET /progress/:lesson_id
  fastify.get<{ Params: { lesson_id: string } }>(
    '/progress/:lesson_id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const row = await db.query.lessonProgress.findFirst({
        where: and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, req.params.lesson_id)),
      });
      if (!row) throw Errors.notFound('Progress');
      return respond(reply, row, 200, req.id);
    },
  );

  // PUT /progress/:lesson_id
  fastify.put<{ Params: { lesson_id: string }; Body: z.infer<typeof ProgressBody> }>(
    '/progress/:lesson_id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId   = uid(req);
      const body     = ProgressBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

      const lessonId = req.params.lesson_id;
      const existing = await db.query.lessonProgress.findFirst({
        where: and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
      });

      const updates = {
        ...(body.data.status !== undefined && { status: body.data.status }),
        ...(body.data.percent_complete !== undefined && { percentComplete: body.data.percent_complete }),
        ...(body.data.time_spent_sec !== undefined && { timeSpentSec: body.data.time_spent_sec }),
        ...(body.data.study_technique !== undefined && { studyTechnique: body.data.study_technique }),
        lastAccessed: new Date(),
        updatedAt:    new Date(),
      };

      if (existing) {
        await db.update(lessonProgress).set(updates).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
      } else {
        await db.insert(lessonProgress).values({
          userId,
          lessonId,
          status:          body.data.status ?? 'in_progress',
          percentComplete: body.data.percent_complete ?? 0,
          timeSpentSec:    body.data.time_spent_sec ?? 0,
          lastAccessed:    new Date(),
        });
      }

      if (body.data.status === 'completed') {
        await logStudyEvent(userId, 'lesson_complete', { lesson_id: lessonId }, db);
        const prefs = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) });
        await recordStudySession(userId, db, prefs?.timezone ?? 'UTC');
      }

      const updated = await db.query.lessonProgress.findFirst({
        where: and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
      });

      return respond(reply, updated, 200, req.id);
    },
  );

  // POST /quiz-attempts
  fastify.post<{ Body: z.infer<typeof QuizAttemptBody> }>(
    '/quiz-attempts',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = QuizAttemptBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const quiz = await db.query.quizzes.findFirst({ where: eq(quizzes.id, body.data.quiz_id) });
      if (!quiz) throw Errors.notFound('Quiz');

      let correct = 0;
      const feedback: Array<{ q_id: string; correct: boolean; explanation: string | undefined }> = [];

      for (const q of quiz.questions) {
        const userAnswer   = body.data.answers[q.id];
        const isCorrect    = userAnswer === q.correct;
        if (isCorrect) correct++;
        feedback.push({ q_id: q.id, correct: isCorrect, explanation: q.explanation?.['en'] });
      }

      const score = quiz.questions.length > 0 ? correct / quiz.questions.length : 0;

      const [attempt] = await db.insert(quizAttempts).values({
        userId,
        quizId:      body.data.quiz_id,
        lessonId:    body.data.lesson_id ?? null,
        answers:     body.data.answers,
        score,
        durationSec: body.data.duration_sec ?? null,
      }).returning();

      await logStudyEvent(userId, 'quiz_complete', { quiz_id: body.data.quiz_id, score }, db);

      return respond(reply, { score, feedback, attempt_id: attempt?.id }, 201, req.id);
    },
  );

  // GET /sr-cards
  fastify.get('/sr-cards', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const today  = todayStr();
    const cards  = await db
      .select()
      .from(srCards)
      .where(and(eq(srCards.userId, userId), lte(srCards.nextReview, today)))
      .orderBy(srCards.nextReview);
    return respond(reply, cards, 200, req.id);
  });

  // GET /sr-cards/:lesson_id
  fastify.get<{ Params: { lesson_id: string } }>(
    '/sr-cards/:lesson_id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const cards  = await db
        .select()
        .from(srCards)
        .where(and(eq(srCards.userId, userId), eq(srCards.lessonId, req.params.lesson_id)));
      return respond(reply, cards, 200, req.id);
    },
  );

  // POST /sr-cards
  fastify.post<{ Body: z.infer<typeof SrCardBody> }>(
    '/sr-cards',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = SrCardBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const [card] = await db.insert(srCards).values({
        userId,
        lessonId:   body.data.lesson_id ?? null,
        term:       body.data.term,
        nextReview: todayStr(),
      }).returning();

      return respond(reply, card, 201, req.id);
    },
  );

  // PATCH /sr-cards/:id/review
  fastify.patch<{ Params: { id: string }; Body: z.infer<typeof SrReviewBody> }>(
    '/sr-cards/:id/review',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const body   = SrReviewBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid');

      const card = await db.query.srCards.findFirst({
        where: and(eq(srCards.id, req.params.id), eq(srCards.userId, userId)),
      });
      if (!card) throw Errors.notFound('SR card');

      const result = sm2Update(
        { ease_factor: card.easeFactor, interval_days: card.intervalDays, repetitions: card.repetitions },
        body.data.quality,
      );

      const nextReviewStr = result.next_review.toISOString().split('T')[0] ?? '';
      await db.update(srCards).set({
        easeFactor:   result.ease_factor,
        intervalDays: result.interval_days,
        repetitions:  result.repetitions,
        nextReview:   nextReviewStr,
        lastReviewed: new Date(),
        updatedAt:    new Date(),
      }).where(eq(srCards.id, req.params.id));

      await logStudyEvent(userId, 'sr_review', { card_id: req.params.id, quality: body.data.quality }, db);
      const prefs = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) });
      await recordStudySession(userId, db, prefs?.timezone ?? 'UTC');

      const updated = await db.query.srCards.findFirst({ where: eq(srCards.id, req.params.id) });
      return respond(reply, updated, 200, req.id);
    },
  );

  // GET /streaks/me
  fastify.get('/streaks/me', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const streak = await db.query.studyStreaks.findFirst({ where: eq(studyStreaks.userId, userId) });
    return respond(reply, streak ?? { userId, currentStreak: 0, longestStreak: 0, lastStudyDate: null }, 200, req.id);
  });

  // POST /streaks/record
  fastify.post('/streaks/record', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const prefs  = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) });
    await recordStudySession(userId, db, prefs?.timezone ?? 'UTC');
    await logStudyEvent(userId, 'session_start', {}, db);
    return respond(reply, { recorded: true }, 200, req.id);
  });

  // GET /daily-plan
  fastify.get<{ Querystring: { date?: string } }>(
    '/daily-plan',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const date   = req.query.date ?? todayStr();

      const existing = await db.query.dailyPlans.findFirst({
        where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, date)),
      });
      if (existing) return respond(reply, existing, 200, req.id);

      const tasks = await generateDailyPlan(userId, db, redis);
      const plan  = await db.query.dailyPlans.findFirst({
        where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, date)),
      });

      return respond(reply, plan ?? { userId, planDate: date, tasks, generatedAt: new Date().toISOString() }, 200, req.id);
    },
  );

  // Compatibility: GET /trail/task/:task_id (same as /v1/api/trail/task/:task_id)
  fastify.get<{ Params: { task_id: string } }>('/trail/task/:task_id', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const taskId = req.params.task_id;

    const plans = await db.select().from(dailyPlans).where(eq(dailyPlans.userId, userId));
    for (const p of plans) {
      const found = (p.tasks as any[]).find(t => t.id === taskId);
      if (found) return respond(reply, found, 200, req.id);
    }

    throw Errors.notFound('Trail task');
  });

  

  // POST /daily-plan/complete/:task_id
  fastify.post<{ Params: { task_id: string } }>(
    '/daily-plan/complete/:task_id',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const today  = todayStr();

      const plan = await db.query.dailyPlans.findFirst({
        where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)),
      });
      if (!plan) throw Errors.notFound('Daily plan');

      const updatedTasks = plan.tasks.map(t =>
        t.id === req.params.task_id ? { ...t, completed: true } : t,
      );

      await db.update(dailyPlans).set({ tasks: updatedTasks }).where(eq(dailyPlans.id, plan.id));
      return respond(reply, { task_id: req.params.task_id, completed: true }, 200, req.id);
    },
  );

  // POST /daily-plan/regenerate
  fastify.post(
    '/daily-plan/regenerate',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const today  = todayStr();

      await db.delete(dailyPlans).where(
        and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)),
      );
      await invalidate(`cache:daily_plan:${userId}:${today}`);

      const tasks = await generateDailyPlan(userId, db, redis);
      return respond(reply, { tasks, regenerated: true }, 200, req.id);
    },
  );
}
