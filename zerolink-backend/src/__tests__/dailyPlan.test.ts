import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from './helpers/testApp.js';
import { parseCookies } from './helpers/cookies.js';

let app:    FastifyInstance;
let cookie: string;

const randomEmail = () => `plan_${Date.now()}@example.com`;

beforeAll(async () => {
  app = await getTestApp();
  const res = await app.inject({
    method: 'POST',
    url:    '/v1/auth/register',
    body:   { email: randomEmail(), password: 'DailyPlan123!' },
  });
  cookie = parseCookies(res.headers);
}, 30_000);

afterAll(async () => {
  await closeTestApp();
});

describe('Daily plan', () => {
  it('generates a plan on first GET', async () => {
    const res = await app.inject({
      method:  'GET',
      url:     '/v1/daily-plan',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { tasks: unknown[]; planDate: string } };
    expect(body.data.planDate).toBeTruthy();
    expect(Array.isArray(body.data.tasks)).toBe(true);
  });

  it('does not regenerate on second GET same day', async () => {
    const res1 = await app.inject({ method: 'GET', url: '/v1/daily-plan', headers: { cookie } });
    const res2 = await app.inject({ method: 'GET', url: '/v1/daily-plan', headers: { cookie } });

    const body1 = JSON.parse(res1.body) as { data: { tasks: unknown[] } };
    const body2 = JSON.parse(res2.body) as { data: { tasks: unknown[] } };

    expect(JSON.stringify(body1.data.tasks)).toBe(JSON.stringify(body2.data.tasks));
  });

  it('regenerate endpoint forces new plan', async () => {
    const regenRes = await app.inject({
      method:  'POST',
      url:     '/v1/daily-plan/regenerate',
      headers: { cookie },
    });
    expect(regenRes.statusCode).toBe(200);
    const body = JSON.parse(regenRes.body) as { data: { regenerated: boolean } };
    expect(body.data.regenerated).toBe(true);
  });

  it('returns 401 without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/daily-plan' });
    expect(res.statusCode).toBe(401);
  });
});
