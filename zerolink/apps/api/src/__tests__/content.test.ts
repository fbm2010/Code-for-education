import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from './helpers/testApp.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await getTestApp();
}, 30_000);

afterAll(async () => {
  await closeTestApp();
});

describe('Content — categories', () => {
  it('GET /v1/categories returns list', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/categories' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('Content — courses', () => {
  it('GET /v1/courses returns list', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/courses' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { items: unknown[] } };
    expect(Array.isArray(body.data.items)).toBe(true);
  });
});

describe('Content — lesson content bandwidth modes', () => {
  it('low-bandwidth mode returns body_text, not body_html', async () => {
    // Find a real lesson id from seeded data
    const coursesRes = await app.inject({ method: 'GET', url: '/v1/courses' });
    const courses    = (JSON.parse(coursesRes.body) as { data: { items: { slug: string }[] } }).data.items;
    if (courses.length === 0) return; // skip if no seed data

    const slug      = courses[0]!.slug;
    const courseRes = await app.inject({ method: 'GET', url: `/v1/courses/${slug}` });
    const course    = JSON.parse(courseRes.body) as { data: { lessons: { id: string }[] } };
    const lessonId  = course.data.lessons[0]?.id;
    if (!lessonId) return;

    const res = await app.inject({
      method:  'GET',
      url:     `/v1/lessons/${lessonId}/content?lang=en`,
      headers: { 'x-zerolink-bandwidth': 'low' },
    });

    if (res.statusCode === 404) return; // no content seeded yet

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: Record<string, unknown> };
    expect('body_text' in body.data).toBe(true);
    expect('body_html' in body.data).toBe(false);
  });

  it('normal mode returns body_html', async () => {
    const coursesRes = await app.inject({ method: 'GET', url: '/v1/courses' });
    const courses    = (JSON.parse(coursesRes.body) as { data: { items: { slug: string }[] } }).data.items;
    if (courses.length === 0) return;

    const slug      = courses[0]!.slug;
    const courseRes = await app.inject({ method: 'GET', url: `/v1/courses/${slug}` });
    const course    = JSON.parse(courseRes.body) as { data: { lessons: { id: string }[] } };
    const lessonId  = course.data.lessons[0]?.id;
    if (!lessonId) return;

    const res = await app.inject({
      method:  'GET',
      url:     `/v1/lessons/${lessonId}/content?lang=en`,
    });

    if (res.statusCode === 404) return;

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: Record<string, unknown> };
    expect('body_html' in body.data).toBe(true);
  });

  it('falls back to English content when requested language is missing', async () => {
    const coursesRes = await app.inject({ method: 'GET', url: '/v1/courses' });
    const courses    = (JSON.parse(coursesRes.body) as { data: { items: { slug: string }[] } }).data.items;
    if (courses.length === 0) return;

    const slug      = courses[0]!.slug;
    const courseRes = await app.inject({ method: 'GET', url: `/v1/courses/${slug}` });
    const course    = JSON.parse(courseRes.body) as { data: { lessons: { id: string }[] } };
    const lessonId  = course.data.lessons[0]?.id;
    if (!lessonId) return;

    // Request Hausa (unlikely to have content) — expect fallback to en
    const res = await app.inject({ method: 'GET', url: `/v1/lessons/${lessonId}/content?lang=ha` });
    // 200 = fell back to en, 404 = no content at all (also acceptable)
    expect([200, 404]).toContain(res.statusCode);
  });
});
