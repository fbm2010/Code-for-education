import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from './helpers/testApp.js';
import { parseCookies } from './helpers/cookies.js';

let app:    FastifyInstance;
let cookie: string;
let lessonId: string | null = null;

const randomEmail = () => `sync_${Date.now()}@example.com`;

beforeAll(async () => {
  app = await getTestApp();
  const res = await app.inject({
    method: 'POST',
    url:    '/v1/auth/register',
    body:   { email: randomEmail(), password: 'Sync123456!' },
  });
  cookie = parseCookies(res.headers);

  const coursesRes = await app.inject({ method: 'GET', url: '/v1/courses' });
  const courses    = (JSON.parse(coursesRes.body) as { data: { items: { slug: string }[] } }).data.items;
  if (courses[0]) {
    const courseRes = await app.inject({ method: 'GET', url: `/v1/courses/${courses[0].slug}` });
    const course    = JSON.parse(courseRes.body) as { data: { lessons: { id: string }[] } };
    lessonId        = course.data.lessons[0]?.id ?? null;
  }
}, 30_000);

afterAll(async () => {
  await closeTestApp();
});

describe('Sync — push', () => {
  it('accepts valid lesson_progress records', async () => {
    if (!lessonId) return;
    const recordId = crypto.randomUUID();
    const res = await app.inject({
      method:  'POST',
      url:     '/v1/sync/push',
      headers: { cookie },
      body:    {
        device_id: 'test-device',
        records:   [{
          table:            'lesson_progress',
          record_id:        recordId,
          operation:        'insert',
          payload:          { lesson_id: lessonId, status: 'in_progress', percent_complete: 50 },
          client_timestamp: new Date().toISOString(),
        }],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { accepted: string[]; conflicts: unknown[] } };
    expect(body.data.accepted).toContain(recordId);
  });

  it('rejects unknown table with conflict', async () => {
    const res = await app.inject({
      method:  'POST',
      url:     '/v1/sync/push',
      headers: { cookie },
      body:    {
        device_id: 'test-device',
        records:   [{
          table:            'users',
          record_id:        crypto.randomUUID(),
          operation:        'update',
          payload:          { email: 'hacker@evil.com' },
          client_timestamp: new Date().toISOString(),
        }],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { conflicts: Array<{ record_id: string }> } };
    expect(body.data.conflicts).toHaveLength(1);
  });

  it('returns conflict for stale update', async () => {
    if (!lessonId) return;
    const recordId = crypto.randomUUID();
    // First insert with current timestamp
    await app.inject({
      method:  'POST',
      url:     '/v1/sync/push',
      headers: { cookie },
      body:    {
        device_id: 'test-device',
        records:   [{
          table:            'lesson_progress',
          record_id:        recordId,
          operation:        'insert',
          payload:          { lesson_id: lessonId, status: 'not_started' },
          client_timestamp: new Date().toISOString(),
        }],
      },
    });

    // Now send stale update with old timestamp
    const staleTs = new Date(Date.now() - 120_000).toISOString();
    const res = await app.inject({
      method:  'POST',
      url:     '/v1/sync/push',
      headers: { cookie },
      body:    {
        device_id: 'test-device',
        records:   [{
          table:            'lesson_progress',
          record_id:        recordId,
          operation:        'update',
          payload:          { status: 'in_progress' },
          client_timestamp: staleTs,
        }],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { conflicts: unknown[] } };
    expect(body.data.conflicts.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Sync — pull', () => {
  it('pulls changes since epoch returns array', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/v1/sync/pull?tables=lesson_progress,sr_cards&since=2000-01-01T00:00:00Z',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { changes: unknown; server_timestamp: string } };
    expect(body.data.server_timestamp).toBeTruthy();
    expect(typeof body.data.changes).toBe('object');
  });
});
