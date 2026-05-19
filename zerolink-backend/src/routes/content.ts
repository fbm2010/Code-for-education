import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, sql, ilike, arrayContains } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  categories, courses, lessons, lessonContent, mediaAssets, quizzes,
  enrollments, lessonProgress,
} from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { Errors } from '../lib/errors.js';
import { getOrSet, invalidatePattern } from '../lib/cache.js';
import { bundleQueue } from '../lib/queues.js';
import { getCachedBundleUrl } from '../services/bundleService.js';
import { redis } from '../lib/redis.js';
import { presignGet, bundleBucket } from '../lib/minio.js';
import { minio } from '../lib/minio.js';
import { config } from '../config.js';

function respond<T>(reply: FastifyReply, data: T, status = 200, reqId: string) {
  return reply.code(status).send({ data, meta: { request_id: reqId, timestamp: new Date().toISOString() } });
}

export async function contentRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /categories
  fastify.get('/categories', async (req, reply) => {
    const data = await getOrSet('cache:categories', 86400, async () => {
      const cats = await db.select().from(categories).orderBy(categories.sortOrder);
      const withCounts = await Promise.all(cats.map(async cat => {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(courses)
          .where(eq(courses.categoryId, cat.id));
        return { ...cat, lesson_count: row?.count ?? 0 };
      }));
      return withCounts;
    });
    return respond(reply, data, 200, req.id);
  });

  // GET /categories/:slug
  fastify.get<{ Params: { slug: string } }>('/categories/:slug', async (req, reply) => {
    const { slug } = req.params;
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    if (!cat) throw Errors.notFound('Category');

    const courseList = await db
      .select()
      .from(courses)
      .where(and(eq(courses.categoryId, cat.id), eq(courses.published, true)));

    return respond(reply, { ...cat, courses: courseList }, 200, req.id);
  });

  // GET /courses
  fastify.get<{ Querystring: { category?: string; language?: string; difficulty?: string; tag?: string; cursor?: string; limit?: string } }>(
    '/courses',
    async (req, reply) => {
      const { category, difficulty, tag, cursor, limit: limitStr } = req.query;
      const limit = Math.min(parseInt(limitStr ?? '20'), 100);

      const filtersHash = Buffer.from(JSON.stringify({ category, difficulty, tag, cursor, limit })).toString('base64');
      const data = await getOrSet(`cache:courses:${filtersHash}`, 43200, async () => {
        const conditions = [eq(courses.published, true)];

        if (category) {
          const cat = await db.query.categories.findFirst({ where: eq(categories.slug, category) });
          if (cat) conditions.push(eq(courses.categoryId, cat.id));
        }
        if (difficulty) {
          conditions.push(eq(courses.difficulty, difficulty as 'beginner' | 'intermediate' | 'advanced'));
        }
        if (tag) {
          conditions.push(sql`${courses.tags} @> ARRAY[${tag}]::text[]`);
        }

        const rows = await db
          .select()
          .from(courses)
          .where(and(...conditions))
          .limit(limit + 1)
          .offset(cursor ? parseInt(atob(cursor)) : 0);

        const hasMore   = rows.length > limit;
        const items     = rows.slice(0, limit);
        const nextOffset = (cursor ? parseInt(atob(cursor)) : 0) + limit;

        return {
          items,
          next_cursor: hasMore ? btoa(String(nextOffset)) : null,
          has_more:    hasMore,
        };
      });

      return respond(reply, data, 200, req.id);
    },
  );

  // GET /courses/:slug
  fastify.get<{ Params: { slug: string } }>('/courses/:slug', async (req, reply) => {
    const { slug } = req.params;
    const course = await db.query.courses.findFirst({ where: eq(courses.slug, slug) });
    if (!course) throw Errors.notFound('Course');

    const lessonList = await db
      .select()
      .from(lessons)
      .where(and(eq(lessons.courseId, course.id), eq(lessons.published, true)))
      .orderBy(lessons.sortOrder);

    return respond(reply, { ...course, lessons: lessonList }, 200, req.id);
  });

  // POST /courses/:slug/enroll
  fastify.post<{ Params: { slug: string } }>(
    '/courses/:slug/enroll',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const userId = (req as FastifyRequest & { userId?: string }).userId;
      if (!userId) throw Errors.unauthorized();

      const course = await db.query.courses.findFirst({ where: eq(courses.slug, req.params.slug) });
      if (!course) throw Errors.notFound('Course');

      await db
        .insert(enrollments)
        .values({ userId, courseId: course.id })
        .onConflictDoNothing();

      return respond(reply, { enrolled: true, course_id: course.id }, 200, req.id);
    },
  );

  // GET /lessons/:id
  fastify.get<{ Params: { id: string } }>('/lessons/:id', async (req, reply) => {
    const data = await getOrSet(`cache:lesson:${req.params.id}`, 21600, async () => {
      const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, req.params.id) });
      if (!lesson) return null;
      return lesson;
    });
    if (!data) throw Errors.notFound('Lesson');
    return respond(reply, data, 200, req.id);
  });

  // GET /lessons/:id/content
  fastify.get<{ Params: { id: string }; Querystring: { lang?: string } }>(
    '/lessons/:id/content',
    async (req, reply) => {
      const { id } = req.params;
      const lang   = req.query.lang ?? 'en';
      const bw     = req.isLowBandwidth ? 'low' : 'normal';

      const cacheKey = `cache:lesson_content:${id}:${lang}:${bw}`;
      const data = await getOrSet(cacheKey, 21600, async () => {
        const content = await db.query.lessonContent.findFirst({
          where: and(eq(lessonContent.lessonId, id), eq(lessonContent.language, lang), eq(lessonContent.published, true)),
        }) ?? await db.query.lessonContent.findFirst({
          where: and(eq(lessonContent.lessonId, id), eq(lessonContent.language, 'en'), eq(lessonContent.published, true)),
        });

        if (!content) return null;

        if (bw === 'low') {
          return { body_text: content.bodyText, audio_url: content.audioUrl, slides_url: content.slidesUrl };
        }

        const media = await db.select().from(mediaAssets).where(eq(mediaAssets.lessonId, id));
        return { body_html: content.bodyHtml, media_assets: media, language: content.language, version: content.version };
      });

      if (!data) throw Errors.notFound('Lesson content');
      return respond(reply, data, 200, req.id);
    },
  );

  // GET /lessons/:id/quiz
  fastify.get<{ Params: { id: string }; Querystring: { lang?: string } }>(
    '/lessons/:id/quiz',
    async (req, reply) => {
      const { id }  = req.params;
      const lang    = req.query.lang ?? 'en';

      const quiz = await db.query.quizzes.findFirst({
        where: and(eq(quizzes.lessonId, id), eq(quizzes.language, lang)),
      }) ?? await db.query.quizzes.findFirst({
        where: and(eq(quizzes.lessonId, id), eq(quizzes.language, 'en')),
      });

      if (!quiz) throw Errors.notFound('Quiz');

      const resolvedQuestions = quiz.questions.map(q => ({
        ...q,
        prompt:      q.prompt[lang] ?? q.prompt['en'] ?? '',
        options:     q.options?.map(o => ({ id: o.id, text: o.text[lang] ?? o.text['en'] ?? '' })),
        explanation: q.explanation ? (q.explanation[lang] ?? q.explanation['en'] ?? '') : undefined,
      }));

      return respond(reply, { quiz_id: quiz.id, lesson_id: id, questions: resolvedQuestions }, 200, req.id);
    },
  );

  // GET /lessons/:id/download
  fastify.get<{ Params: { id: string }; Querystring: { lang?: string } }>(
    '/lessons/:id/download',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { id }  = req.params;
      const lang    = req.query.lang ?? 'en';

      // Check Redis cache
      const cached = await getCachedBundleUrl(id, lang);
      if (cached) return respond(reply, { url: cached, status: 'ready' }, 200, req.id);

      // Check MinIO
      const content = await db.query.lessonContent.findFirst({
        where: and(eq(lessonContent.lessonId, id), eq(lessonContent.language, lang)),
      });
      if (!content) throw Errors.notFound('Lesson content');

      const objectKey = `lessons/${id}/${lang}/v${content.version}.zip`;
      try {
        await minio.statObject(bundleBucket(), objectKey);
        const url = await presignGet(bundleBucket(), objectKey);
        await redis.set(`bundle:${id}:${lang}`, url, 'EX', 3600);
        return respond(reply, { url, status: 'ready' }, 200, req.id);
      } catch {
        // Not in MinIO — enqueue generation
        await bundleQueue.add('generate-bundle', { lesson_id: id, language: lang });
        return respond(reply, { status: 'generating', estimated_seconds: 30 }, 202, req.id);
      }
    },
  );

  // GET /lessons/:id/media
  fastify.get<{ Params: { id: string } }>('/lessons/:id/media', async (req, reply) => {
    const media = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.lessonId, req.params.id));
    return respond(reply, media, 200, req.id);
  });
}
