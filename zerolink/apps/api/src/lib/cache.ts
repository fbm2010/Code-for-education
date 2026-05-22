import { redis } from './redis.js';

export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      // fall through
    }
  }
  const value = await fn();
  // Don't cache empty arrays — let the next request retry the DB
  if (!(Array.isArray(value) && value.length === 0)) {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
  return value;
}

export async function invalidate(key: string): Promise<void> {
  await redis.del(key);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
