import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from './helpers/testApp.js';
import { parseCookies } from './helpers/cookies.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await getTestApp();
}, 30_000);

afterAll(async () => {
  await closeTestApp();
});

const randomEmail = () => `test_${Date.now()}@example.com`;

describe('Auth — register', () => {
  it('registers a new user and returns a session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    '/v1/auth/register',
      body:   { email: randomEmail(), password: 'Password123!' },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { data: { user: { id: string } }; meta: unknown };
    expect(body.data.user.id).toBeTruthy();
    expect(res.headers['set-cookie']).toBeTruthy();
  });

  it('returns 409 for duplicate email', async () => {
    const email = randomEmail();
    await app.inject({ method: 'POST', url: '/v1/auth/register', body: { email, password: 'Password123!' } });
    const res = await app.inject({ method: 'POST', url: '/v1/auth/register', body: { email, password: 'Password123!' } });
    expect(res.statusCode).toBe(409);
  });

  it('returns 422 for short password', async () => {
    const res = await app.inject({
      method: 'POST',
      url:    '/v1/auth/register',
      body:   { email: randomEmail(), password: 'short' },
    });
    expect(res.statusCode).toBe(422);
  });
});

describe('Auth — login', () => {
  it('logs in with correct credentials', async () => {
    const email    = randomEmail();
    const password = 'Password123!';
    await app.inject({ method: 'POST', url: '/v1/auth/register', body: { email, password } });

    const res = await app.inject({ method: 'POST', url: '/v1/auth/login', body: { email, password } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    const email = randomEmail();
    await app.inject({ method: 'POST', url: '/v1/auth/register', body: { email, password: 'Password123!' } });
    const res = await app.inject({ method: 'POST', url: '/v1/auth/login', body: { email, password: 'WrongPass!' } });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for non-existent user', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/login', body: { email: 'no@exists.com', password: 'anything' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('Auth — guest', () => {
  it('creates guest account with session', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/guest' });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as { data: { user: { isGuest: boolean } } };
    expect(body.data.user.isGuest).toBe(true);
  });
});

describe('Auth — logout', () => {
  it('clears session cookie on logout', async () => {
    const registerRes = await app.inject({
      method: 'POST',
      url:    '/v1/auth/register',
      body:   { email: randomEmail(), password: 'Password123!' },
    });
    const cookie = parseCookies(registerRes.headers);

    const logoutRes = await app.inject({
      method:  'POST',
      url:     '/v1/auth/logout',
      headers: { cookie },
    });
    expect(logoutRes.statusCode).toBe(200);
  });
});

describe('Auth — me', () => {
  it('returns user info when authenticated', async () => {
    const email = randomEmail();
    const registerRes = await app.inject({
      method: 'POST',
      url:    '/v1/auth/register',
      body:   { email, password: 'Password123!' },
    });
    const cookie = parseCookies(registerRes.headers);

    const meRes = await app.inject({
      method:  'GET',
      url:     '/v1/auth/me',
      headers: { cookie },
    });
    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.body) as { data: { user: { email: string } } };
    expect(body.data.user.email).toBe(email);
  });

  it('returns 401 without session', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});
