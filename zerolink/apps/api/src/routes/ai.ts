import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import {
  generateWorksheet, generateFlashcards, generateQuiz, generateMindMap,
  validateEducationalContent, checkGroq,
} from '../services/groqService.js';
import { db } from '../db/index.js';
import { srCards, lessons, communityNotebooks, dailyPlans } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';

function respond(reply: FastifyReply, data: unknown, status = 200) {
  return reply.code(status).send({ data });
}

function uid(req: Parameters<typeof authenticate>[0]): string {
  const u = (req as typeof req & { userId?: string }).userId;
  if (!u) throw Errors.unauthorized();
  return u;
}

const GenerateWorksheetBody = z.object({
  topic:   z.string().max(200).optional(),
  context: z.string().max(12000).optional(),
  level:   z.enum(['Beginner', 'Intermediate', 'Advanced']),
  focus:   z.string().max(500).optional(),
}).refine(d => d.topic || d.context, { message: 'topic or context required' });

const GenerateFlashcardsBody = z.object({
  topic:    z.string().max(200).optional(),
  context:  z.string().max(12000).optional(),
  count:    z.number().int().min(1).max(50).default(10),
  level:    z.enum(['Beginner', 'Intermediate', 'Advanced']),
  lessonId: z.string().uuid().optional(),
}).refine(d => d.topic || d.context, { message: 'topic or context required' });

const GenerateQuizBody = z.object({
  topic:   z.string().max(200).optional(),
  context: z.string().max(12000).optional(),
  count:   z.number().int().min(1).max(20).default(5),
  level:   z.enum(['Beginner', 'Intermediate', 'Advanced']),
}).refine(d => d.topic || d.context, { message: 'topic or context required' });

const GenerateMindMapBody = z.object({
  topic:   z.string().max(200).optional(),
  context: z.string().max(12000).optional(),
}).refine(d => d.topic || d.context, { message: 'topic or context required' });

const SaveTrailBody = z.object({
  type:        z.enum(['worksheet', 'mindmap', 'flashcards', 'quiz']),
  title:       z.string().min(1).max(300),
  durationMin: z.number().int().min(1).max(180).default(15),
  payload:     z.any().optional(),
});

const PublishCommunityBody = z.object({
  title:   z.string().min(1).max(200),
  body:    z.string().min(10).max(20000),
  subject: z.string().min(1).max(100),
});

const TASK_ICONS: Record<string, string> = {
  worksheet: '📄', mindmap: '🗺️', flashcards: '🗃️', quiz: '🧠',
};

export async function aiRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/ai/health
  fastify.get('/ai/health', async (_req, reply) => {
    const status = await checkGroq();
    return reply.code(200).send({ data: status });
  });

  // POST /api/worksheets/generate
  fastify.post('/worksheets/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateWorksheetBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');
    const result = await generateWorksheet(body.data.topic ?? '', body.data.level, body.data.focus, body.data.context);
    return respond(reply, result);
  });

  // POST /api/flashcards/generate — always saves cards to SR deck
  fastify.post('/flashcards/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateFlashcardsBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

    const result = await generateFlashcards(body.data.topic ?? '', body.data.count, body.data.level, body.data.context);
    if ('error' in (result as object)) return respond(reply, result);

    const userId = uid(req);

    // Validate lessonId if given
    if (body.data.lessonId) {
      const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, body.data.lessonId) });
      if (!lesson) throw Errors.notFound('Lesson');
    }

    const today = new Date().toISOString().split('T')[0]!;
    const cards  = (result as { cards: Array<{ front: string; back: string }> }).cards;

    const inserted = await db.insert(srCards).values(
      cards.map(card => ({
        userId,
        lessonId:   body.data.lessonId ?? null,
        term:       { front: card.front, back: card.back, language: 'en' },
        nextReview: today,
      })),
    ).returning();

    const normalizedCards = inserted.map(c => ({ front: c.term.front, back: c.term.back }));
    return respond(reply, { cards: normalizedCards, saved: true }, 201);
  });

  // POST /api/quiz/generate
  fastify.post('/quiz/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateQuizBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');
    const result = await generateQuiz(body.data.topic ?? '', body.data.count, body.data.level, body.data.context);
    if ('error' in (result as object)) return respond(reply, result);

    // Do not return correct answers in the public response — strip `answer` before sending to clients.
    const full = result as any;
    const masked = {
      questions: full.questions.map((q: any) => ({ question: q.question, options: q.options, explanation: q.explanation })),
    };
    return respond(reply, { quiz: masked, full }, 200);
  });

  // POST /api/mind-map/generate
  fastify.post('/mind-map/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateMindMapBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');
    const result = await generateMindMap(body.data.topic ?? '', body.data.context);
    return respond(reply, result);
  });

  // POST /api/trail/save — add any generated creation to today's study trail
  fastify.post('/trail/save', { preHandler: [authenticate] }, async (req, reply) => {
    const body = SaveTrailBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

    const userId = uid(req);
    const today  = new Date().toISOString().split('T')[0]!;

    const plan = await db.query.dailyPlans.findFirst({
      where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newTask: any = {
      id:           crypto.randomUUID(),
      type:         body.data.type,
      lesson_id:    null,
      description:  { en: `${TASK_ICONS[body.data.type] ?? '📄'} ${body.data.title}` },
      duration_min: body.data.durationMin,
      completed:    false,
      payload:      body.data.payload ?? null,
    };

    if (plan) {
      const tasks = [...(plan.tasks as unknown[]), newTask];
      await db.update(dailyPlans).set({ tasks }).where(eq(dailyPlans.id, plan.id));
    } else {
      await db.insert(dailyPlans).values({
        userId,
        planDate:    today,
        tasks:       [newTask],
        generatedAt: new Date(),
      });
    }

    return respond(reply, { saved: true, task: newTask }, 201);
  });

  // GET /api/trail/task/:task_id — retrieve saved task (including payload)
  fastify.get('/trail/task/:task_id', { preHandler: [authenticate] }, async (req, reply) => {
    const userId = uid(req as any);
    const taskId = (req as any).params.task_id as string;

    const plans = await db.select().from(dailyPlans).where(eq(dailyPlans.userId, userId));
    for (const p of plans) {
      const found = (p.tasks as any[]).find(t => t.id === taskId);
      if (found) return respond(reply, found, 200);
    }

    throw Errors.notFound('Trail task');
  });

  // POST /api/community/publish — AI validates then publishes to community
  fastify.post('/community/publish', { preHandler: [authenticate] }, async (req, reply) => {
    const body = PublishCommunityBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

    const userId = uid(req);

    const validation = await validateEducationalContent(body.data.body);

    if ('error' in (validation as object)) {
      throw Errors.validation('AI validation service unavailable. Please try again.');
    }

    const v = validation as { valid: boolean; score: number; reason: string; topics: string[] };

    if (!v.valid || v.score < 70) {
      return respond(reply, { published: false, score: v.score, reason: v.reason });
    }

    const [notebook] = await db.insert(communityNotebooks).values({
      userId,
      title:   body.data.title,
      body:    body.data.body,
      subject: `community-published:${body.data.subject}`,
    }).returning();

    return respond(reply, { published: true, score: v.score, topics: v.topics, id: notebook?.id }, 201);
  });

  // GET /api/community/published — browse AI-validated community content
  fastify.get('/community/published', { preHandler: [authenticate] }, async (_req, reply) => {
    const notebooks = await db
      .select()
      .from(communityNotebooks)
      .orderBy(communityNotebooks.createdAt);

    const published = notebooks
      .filter(n => n.subject.startsWith('community-published:'))
      .map(n => ({ ...n, subject: n.subject.replace('community-published:', '') }));

    return respond(reply, published);
  });
}
