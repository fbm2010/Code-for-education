/**
 * Integration test helper — builds a Fastify app without starting it.
 * Requires: DATABASE_URL_TEST env (or DATABASE_URL), running Postgres + Redis.
 */
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../server.js';

let _app: FastifyInstance | null = null;

export async function getTestApp(): Promise<FastifyInstance> {
  if (_app) return _app;
  _app = await buildApp({ testing: true });
  await _app.ready();
  return _app;
}

export async function closeTestApp(): Promise<void> {
  if (_app) {
    await _app.close();
    _app = null;
  }
}
