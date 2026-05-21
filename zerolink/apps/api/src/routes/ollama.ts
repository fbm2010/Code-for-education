import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import {
  generateWorksheet, generateFlashcards, generateQuiz, generateMindMap, checkOllama,
} from '../services/ollamaService.js';
import { db } from '../db/index.js';
import { srCards, lessons } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { Errors } from '../lib/errors.js';

function respond(reply: FastifyReply, data: unknown, status = 200) {
  return reply.code(status).send({ data });
}

const GenerateWorksheetBody = z.object({
  topic: z.string().min(1).max(200),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  focus: z.string().max(500).optional(),
});

const GenerateFlashcardsBody = z.object({
  topic:   z.string().min(1).max(200),
  count:   z.number().int().min(1).max(50).default(10),
  level:   z.enum(['Beginner', 'Intermediate', 'Advanced']),
  lessonId: z.string().uuid().optional(),
});

const GenerateQuizBody = z.object({
  topic: z.string().min(1).max(200),
  count: z.number().int().min(1).max(20).default(5),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
});

const GenerateMindMapBody = z.object({ topic: z.string().min(1).max(200) });

export async function ollamaRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/ollama/health
  fastify.get('/ollama/health', async (_req, reply) => {
    const status = await checkOllama();
    return reply.code(200).send({ data: status });
  });

  // POST /api/worksheets/generate
  fastify.post('/worksheets/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateWorksheetBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');
    const result = await generateWorksheet(body.data.topic, body.data.level, body.data.focus);
    return respond(reply, result);
  });

  // POST /api/flashcards/generate
  fastify.post('/flashcards/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateFlashcardsBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

    const result = await generateFlashcards(body.data.topic, body.data.count, body.data.level);
    if ('error' in result) return respond(reply, result);

    const authReq = req as typeof req & { user?: { id: string } };
    if (!authReq.user) throw Errors.unauthorized();

    // Persist as SR cards if a lessonId is provided
    if (body.data.lessonId) {
      const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, body.data.lessonId) });
      if (!lesson) throw Errors.notFound('Lesson');

      const today = new Date().toISOString().split('T')[0]!;
      const inserted = await db.insert(srCards).values(
        result.cards.map(card => ({
          userId:   authReq.user!.id,
          lessonId: body.data.lessonId!,
          term:     { front: card.front, back: card.back, language: 'en' },
          nextReview: today,
        })),
      ).returning();

      return respond(reply, { cards: inserted }, 201);
    }

    return respond(reply, result);
  });

  // POST /api/quiz/generate
  fastify.post('/quiz/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateQuizBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');
    const result = await generateQuiz(body.data.topic, body.data.count, body.data.level);
    return respond(reply, result);
  });

  // POST /api/mind-map/generate
  fastify.post('/mind-map/generate', { preHandler: [authenticate] }, async (req, reply) => {
    const body = GenerateMindMapBody.safeParse(req.body);
    if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');
    const result = await generateMindMap(body.data.topic);
    return respond(reply, result);
  });
}
