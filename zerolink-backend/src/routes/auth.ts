import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { lucia } from '../lib/lucia.js';
import { db } from '../db/index.js';
import { users, userPreferences, studyStreaks } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError, Errors } from '../lib/errors.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';

const argon2Options = {
  memoryCost: 65536,
  timeCost:   3,
  outputLen:  32,
  parallelism: 1,
};

const RegisterBody = z.object({
  email:       z.string().email().optional(),
  username:    z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  password:    z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
}).refine(d => d.email ?? d.username, { message: 'email or username required' });

const LoginBody = z.object({
  email:    z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1),
}).refine(d => d.email ?? d.username, { message: 'email or username required' });

const GuestUpgradeBody = z.object({
  email:       z.string().email(),
  password:    z.string().min(8).max(128),
  displayName: z.string().min(1).max(100).optional(),
});

function respond<T>(reply: FastifyReply, data: T, status = 200, reqId: string) {
  return reply.code(status).send({ data, meta: { request_id: reqId, timestamp: new Date().toISOString() } });
}

async function createDefaultsForUser(userId: string): Promise<void> {
  await db.insert(userPreferences).values({ userId }).onConflictDoNothing();
  await db.insert(studyStreaks).values({ userId }).onConflictDoNothing();
}

function randomGuestName(): string {
  return `explorer_${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authRateLimit = {
    config: {
      rateLimit: {
        max:        config.AUTH_RATE_LIMIT_MAX,
        timeWindow: config.AUTH_RATE_LIMIT_WINDOW_MS,
      },
    },
  };

  // POST /auth/register
  fastify.post<{ Body: z.infer<typeof RegisterBody> }>(
    '/register',
    { ...authRateLimit },
    async (req, reply) => {
      const body = RegisterBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

      const { email, username, password, displayName } = body.data;

      if (email) {
        const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (existing) throw Errors.conflict('Email already registered');
      }
      if (username) {
        const existing = await db.query.users.findFirst({ where: eq(users.username, username) });
        if (existing) throw Errors.conflict('Username taken');
      }

      const passwordHash = await hash(password, argon2Options);
      const [user] = await db.insert(users).values({
        email:       email ?? null,
        username:    username ?? null,
        passwordHash,
        displayName: displayName ?? username ?? email?.split('@')[0] ?? null,
        isGuest:     false,
      }).returning();

      if (!user) throw Errors.internal();

      await createDefaultsForUser(user.id);

      const session    = await lucia.createSession(user.id, {});
      const cookie     = lucia.createSessionCookie(session.id);
      reply.header('Set-Cookie', cookie.serialize());

      return respond(reply, { user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName } }, 201, req.id);
    },
  );

  // POST /auth/login
  fastify.post<{ Body: z.infer<typeof LoginBody> }>(
    '/login',
    { ...authRateLimit },
    async (req, reply) => {
      const body = LoginBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

      const { email, username, password } = body.data;

      const user = email
        ? await db.query.users.findFirst({ where: and(eq(users.email, email), isNull(users.deletedAt)) })
        : await db.query.users.findFirst({ where: and(eq(users.username, username!), isNull(users.deletedAt)) });

      if (!user || !user.passwordHash) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
      }

      const valid = await verify(user.passwordHash, password, argon2Options);
      if (!valid) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);

      const session = await lucia.createSession(user.id, {});
      const cookie  = lucia.createSessionCookie(session.id);
      reply.header('Set-Cookie', cookie.serialize());

      return respond(reply, { user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName } }, 200, req.id);
    },
  );

  // POST /auth/logout
  fastify.post('/logout', { preHandler: [authenticate] }, async (req, reply) => {
    const session = (req as FastifyRequest & { session?: { id: string } }).session;
    if (session) await lucia.invalidateSession(session.id);
    const blank = lucia.createBlankSessionCookie();
    reply.header('Set-Cookie', blank.serialize());
    return respond(reply, { message: 'Logged out' }, 200, req.id);
  });

  // GET /auth/me
  fastify.get('/me', { preHandler: [authenticate] }, async (req, reply) => {
    const user = (req as FastifyRequest & { user?: { id: string; email: string | null; username: string | null; displayName: string | null; isGuest: boolean; role: string } }).user;
    if (!user) throw Errors.unauthorized();
    const prefs = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, user.id) });
    return respond(reply, { user, preferences: prefs ?? null }, 200, req.id);
  });

  // POST /auth/refresh
  fastify.post('/refresh', { preHandler: [authenticate] }, async (req, reply) => {
    const session = (req as FastifyRequest & { session?: { id: string } }).session;
    if (!session) throw Errors.unauthorized();
    // Lucia handles refresh automatically on validation — just return OK
    return respond(reply, { message: 'Session refreshed' }, 200, req.id);
  });

  // POST /auth/guest
  fastify.post('/guest', { ...authRateLimit }, async (req, reply) => {
    const guestName = randomGuestName();
    const [user] = await db.insert(users).values({
      username:    guestName,
      displayName: guestName,
      isGuest:     true,
    }).returning();
    if (!user) throw Errors.internal();

    await createDefaultsForUser(user.id);

    const session = await lucia.createSession(user.id, {});
    const cookie  = lucia.createSessionCookie(session.id);
    reply.header('Set-Cookie', cookie.serialize());

    return respond(reply, { user: { id: user.id, username: user.username, isGuest: true } }, 201, req.id);
  });

  // POST /auth/guest/upgrade
  fastify.post<{ Body: z.infer<typeof GuestUpgradeBody> }>(
    '/guest/upgrade',
    { preHandler: [authenticate] },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { user?: { id: string; isGuest: boolean } };
      if (!authReq.user?.isGuest) {
        throw Errors.badRequest('Account is not a guest account');
      }

      const body = GuestUpgradeBody.safeParse(req.body);
      if (!body.success) throw Errors.validation(body.error.issues[0]?.message ?? 'Invalid input');

      const { email, password, displayName } = body.data;
      const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) throw Errors.conflict('Email already registered');

      const passwordHash = await hash(password, argon2Options);
      const [updated] = await db
        .update(users)
        .set({ email: email ?? null, passwordHash, isGuest: false, displayName: displayName ?? authReq.user.id, updatedAt: new Date() })
        .where(eq(users.id, authReq.user.id))
        .returning();

      return respond(reply, { user: { id: updated?.id, email: updated?.email } }, 200, req.id);
    },
  );
}
