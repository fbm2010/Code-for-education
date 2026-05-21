import 'dotenv/config';
import Fastify from 'fastify';
import { pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import compress    from '@fastify/compress';
import cors        from '@fastify/cors';
import cookie      from '@fastify/cookie';
import rateLimit   from '@fastify/rate-limit';
import multipart   from '@fastify/multipart';
import swagger     from '@fastify/swagger';
import swaggerUi   from '@fastify/swagger-ui';
import { ZodError } from 'zod';

import { config }  from './config.js';
import { logger }  from './lib/logger.js';
import { redis, connectRedis } from './lib/redis.js';
import { db }      from './db/index.js';
import { sql }     from 'drizzle-orm';
import { ensureBuckets } from './lib/minio.js';
import { AppError } from './lib/errors.js';
import { registerBandwidthHook } from './middleware/bandwidth.js';

import { authRoutes }      from './routes/auth.js';
import { contentRoutes }   from './routes/content.js';
import { progressRoutes }  from './routes/progress.js';
import { syncRoutes }      from './routes/sync.js';
import { communityRoutes } from './routes/community.js';
import { usersRoutes }     from './routes/users.js';
import { adminRoutes }     from './routes/admin.js';
import { ollamaRoutes }    from './routes/ollama.js';

import { startBundleWorker } from './jobs/generateBundles.js';
import { startMediaWorker }  from './jobs/processMedia.js';
import { registerCronJobs }  from './jobs/scheduledJobs.js';

export async function buildApp(opts: { testing?: boolean } = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: opts.testing ? false : logger as unknown as Parameters<typeof Fastify>[0]['logger'],
    genReqId: () => crypto.randomUUID(),
    trustProxy: true,
  });

  // 1. Compression
  await fastify.register(compress, { encodings: ['br', 'gzip', 'deflate'] });

  // 2. CORS
  await fastify.register(cors, {
    origin:      config.APP_URL,
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 3. Cookie
  await fastify.register(cookie);

  // 4. Rate limiting (disabled in test environment)
  if (!opts.testing) {
    await fastify.register(rateLimit, {
      global:     true,
      max:        config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW_MS,
      redis:      redis,
      keyGenerator: (req) => {
        const r = req as typeof req & { userId?: string };
        return r.userId ?? req.ip;
      },
    });
  }

  // 5. Multipart
  await fastify.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  // 6. Swagger (dev only)
  if (config.NODE_ENV !== 'production') {
    await fastify.register(swagger, {
      openapi: {
        info: { title: 'ZeroLink API', version: '1.0.0', description: 'Offline-first multilingual learning platform' },
        servers: [{ url: config.API_URL }],
        components: { securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'zerolink_session' } } },
      },
    });
    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig:    { docExpansion: 'list' },
    });
  }

  // 7. Bandwidth detection hook (applied to all routes)
  registerBandwidthHook(fastify);

  // 8. Error handler
  fastify.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) },
      });
    }

    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return reply.code(422).send({
        error: { code: 'VALIDATION_ERROR', message: issue?.message ?? 'Invalid input', field: issue?.path.join('.') },
      });
    }

    // Rate limit
    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.code(429).send({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } });
    }

    logger.error({ err: error, reqId: req.id }, 'Unhandled error');
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  });

  // 9. Health check
  fastify.get('/health', async (_req, reply) => {
    let dbStatus:    'ok' | 'error' = 'ok';
    let redisStatus: 'ok' | 'error' = 'ok';

    try { await db.execute(sql`SELECT 1`); } catch { dbStatus = 'error'; }
    try { await redis.ping(); }             catch { redisStatus = 'error'; }

    const code = dbStatus === 'ok' && redisStatus === 'ok' ? 200 : 503;
    return reply.code(code).send({ status: 'ok', db: dbStatus, redis: redisStatus });
  });

  // 10. Register route modules
  await fastify.register(authRoutes,      { prefix: '/v1/auth' });
  await fastify.register(contentRoutes,   { prefix: '/v1' });
  await fastify.register(progressRoutes,  { prefix: '/v1' });
  await fastify.register(syncRoutes,      { prefix: '/v1' });
  await fastify.register(communityRoutes, { prefix: '/v1' });
  await fastify.register(usersRoutes,     { prefix: '/v1' });
  await fastify.register(adminRoutes,     { prefix: '/v1/admin' });
  await fastify.register(ollamaRoutes,    { prefix: '/v1/api' });

  return fastify;
}

async function main(): Promise<void> {
  try {
    await connectRedis();
    logger.info('Redis connected');

    if (config.NODE_ENV !== 'test') {
      await ensureBuckets().then(
        () => logger.info('MinIO buckets ready'),
        (err: unknown) => logger.warn({ err }, 'MinIO unavailable — object storage features disabled'),
      );
    }

    const app = await buildApp();

    // Start background workers
    const bundleWorker = startBundleWorker();
    const mediaWorker  = startMediaWorker();
    registerCronJobs();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down…');
      await app.close();
      await bundleWorker.close();
      await mediaWorker.close();
      await redis.quit();
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT',  () => void shutdown('SIGINT'));

    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info({ port: config.PORT }, `ZeroLink API listening`);
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
