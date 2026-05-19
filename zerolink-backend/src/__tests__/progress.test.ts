import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from './helpers/testApp.js';
import { parseCookies } from './helpers/cookies.js';

let app:    FastifyInstance;
let cookie: string;
let lessonId: string | null = null;
let quizId: string | null   = null;

const randomEmail = () => `progress_${Date.now()}@example.com`;

beforeAll(async () => {
  app = await getTestApp();

  // Register + get session
  const res = await app.inject({
    method: 'POST',
    url:    '/v1/auth/register',
    body:   { email: randomEmail(), password: 'Progress123!' },
  });
  cookie = parseCookies(res.headers);

  // Find a lesson id from seed data
  const coursesRes = await app.inject({ method: 'GET', url: '/v1/courses' });
  const courses    = (JSON.parse(coursesRes.body) as { data: { items: { slug: string }[] } }).data.items;
  if (courses[0]) {
    const courseRes = await app.inject({ method: 'GET', url: `/v1/courses/${courses[0].slug}` });
    const course    = JSON.parse(courseRes.body) as { data: { lessons: { id: string }[] } };
    lessonId        = course.data.lessons[0]?.id ?? null;

    if (lessonId) {
      const quizRes = await app.inject({ method: 'GET', url: `/v1/lessons/${lessonId}/quiz?lang=en`, headers: { cookie } });
      if (quizRes.statusCode === 200) {
        quizId = (JSON.parse(quizRes.body) as { data: { quiz_id: string } }).data.quiz_id;
      }
    }
  }
}, 30_000);

afterAll(async () => {
  await closeTestApp();
});

describe('Progress — upsert', () => {
  it('creates progress for a lesson', async () => {
    if (!lessonId) return;
    const res = await app.inject({
      method:  'PUT',
      url:     `/v1/progress/${lessonId}`,
      headers: { cookie },
      body:    { status: 'in_progress', percent_complete: 50 },
    });
    expect([200, 201]).toContain(res.statusCode);
  });

  it('updates existing progress to completed', async () => {
    if (!lessonId) return;
    const res = await app.inject({
      method:  'PUT',
      url:     `/v1/progress/${lessonId}`,
      headers: { cookie },
      body:    { status: 'completed', percent_complete: 100, time_spent_sec: 300 },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { status: string } };
    expect(body.data.status).toBe('completed');
  });
});

describe('Progress — SR cards', () => {
  it('creates an SR card', async () => {
    if (!lessonId) return;
    const res = await app.inject({
      method:  'POST',
      url:     '/v1/sr-cards',
      headers: { cookie },
      body:    {
        lesson_id: lessonId,
        term:      { front: 'What is 2+2?', back: '4', language: 'en' },
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('reviews an SR card and applies SM-2', async () => {
    if (!lessonId) return;
    const createRes = await app.inject({
      method:  'POST',
      url:     '/v1/sr-cards',
      headers: { cookie },
      body:    { lesson_id: lessonId, term: { front: 'Capital of Kenya?', back: 'Nairobi', language: 'en' } },
    });
    const card = JSON.parse(createRes.body) as { data: { id: string; repetitions: number } };

    const reviewRes = await app.inject({
      method:  'PATCH',
      url:     `/v1/sr-cards/${card.data.id}/review`,
      headers: { cookie },
      body:    { quality: 5 },
    });
    expect(reviewRes.statusCode).toBe(200);
    const updated = JSON.parse(reviewRes.body) as { data: { repetitions: number } };
    expect(updated.data.repetitions).toBe(card.data.repetitions + 1);
  });
});

describe('Progress — quiz attempt', () => {
  it('submits a quiz attempt and computes score', async () => {
    if (!quizId || !lessonId) return;
    const res = await app.inject({
      method:  'POST',
      url:     '/v1/quiz-attempts',
      headers: { cookie },
      body:    { quiz_id: quizId, lesson_id: lessonId, answers: {}, duration_sec: 120 },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { data: { score: number; feedback: unknown[] } };
    expect(typeof body.data.score).toBe('number');
    expect(Array.isArray(body.data.feedback)).toBe(true);
  });
});
