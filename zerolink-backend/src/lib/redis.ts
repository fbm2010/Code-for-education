import { Redis } from 'ioredis';
import { config } from '../config.js';
import { logger } from './logger.js';

const makeClient = (name: string) => {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on('connect',      () => logger.info({ name }, 'Redis connected'));
  client.on('error',        (err: Error) => logger.error({ name, err }, 'Redis error'));
  client.on('reconnecting', () => logger.warn({ name }, 'Redis reconnecting'));

  return client;
};

// Separate clients for commands and subscriptions (ioredis requirement for pub/sub)
export const redis     = makeClient('main');
export const redisSub  = makeClient('sub');
export const redisPub  = makeClient('pub');

// ── Helpers ───────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(...keys);
}

/** Sliding-window rate limiter — returns current count */
export async function rateLimit(key: string, max: number, windowMs: number): Promise<number> {
  const now    = Date.now();
  const window = Math.floor(now / windowMs);
  const rKey   = `rl:${key}:${window}`;

  const count = await redis
    .multi()
    .incr(rKey)
    .expire(rKey, Math.ceil(windowMs / 1000) + 1)
    .exec();

  return (count?.[0]?.[1] as number) ?? 0;
}

export async function connectRedis(): Promise<void> {
  await Promise.all([redis.connect(), redisSub.connect(), redisPub.connect()]);
}
