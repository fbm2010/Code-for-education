import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { hash, verify } from '@node-rs/argon2';
import { OAuth2Client, generateState } from 'oslo/oauth2';
import { lucia } from '../lib/lucia.js';
import { db } from '../db/index.js';
import { users, userPreferences, studyStreaks, oauthAccounts } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError, Errors } from '../lib/errors.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { redis } from '../lib/redis.js';

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

  // ── Email Verification ────────────────────────────────────────

  // POST /auth/verify-email/request — send a verification link
  fastify.post('/verify-email/request', { preHandler: [authenticate] }, async (req, reply) => {
    const authReq = req as FastifyRequest & { user?: { id: string; email: string | null } };
    const userId  = authReq.user?.id;
    const email   = authReq.user?.email;
    if (!userId || !email) throw Errors.badRequest('Account has no email address to verify');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user?.emailVerified) throw Errors.badRequest('Email is already verified');

    // Generate token and store in Redis (24-hour TTL)
    const token  = crypto.randomUUID().replace(/-/g, '');
    const key    = `email_verify:${token}`;
    await redis.setex(key, 86400, userId);

    const verifyUrl = `${config.API_URL}/v1/auth/verify-email/${token}`;

    // In production this would call an email service (SES, SendGrid, etc.)
    // For now we log the URL so it can be used in development / tested directly.
    logger.info({ email, verifyUrl }, 'Email verification link generated');

    return respond(reply, { message: 'Verification link sent. Check your email (or logs in dev mode).' }, 200, req.id);
  });

  // GET /auth/verify-email/:token — confirm the email address
  fastify.get<{ Params: { token: string } }>(
    '/verify-email/:token',
    async (req, reply) => {
      const { token } = req.params;
      const key        = `email_verify:${token}`;
      const userId     = await redis.get(key);
      if (!userId) throw Errors.badRequest('Verification link is invalid or has expired');

      await db
        .update(users)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(users.id, userId));

      await redis.del(key);
      logger.info({ userId }, 'Email verified successfully');

      return respond(reply, { message: 'Email verified successfully!' }, 200, req.id);
    },
  );

  // ── OAuth: Google ─────────────────────────────────────────────
  // Only register OAuth routes when credentials are configured
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    const googleClient = new OAuth2Client(
      config.GOOGLE_CLIENT_ID,
      'https://accounts.google.com/o/oauth2/v2/auth',
      'https://oauth2.googleapis.com/token',
      { redirectURI: `${config.API_URL}/v1/auth/oauth/google/callback` },
    );

    // GET /auth/oauth/google — redirect user to Google consent screen
    fastify.get('/oauth/google', async (_req, reply) => {
      const state = generateState();
      // Store state in Redis for 5 minutes (CSRF guard)
      await redis.setex(`oauth_state:${state}`, 300, '1');

      const url = await googleClient.createAuthorizationURL({
        state,
        scopes: ['openid', 'email', 'profile'],
      });

      return reply.redirect(url.toString());
    });

    // GET /auth/oauth/google/callback
    fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
      '/oauth/google/callback',
      async (req, reply) => {
        const { code, state, error } = req.query;

        if (error) throw Errors.badRequest(`OAuth error: ${error}`);
        if (!code || !state) throw Errors.badRequest('Missing code or state');

        // Validate state (CSRF check)
        const stateKey = `oauth_state:${state}`;
        const stored = await redis.get(stateKey);
        if (!stored) throw Errors.badRequest('Invalid or expired OAuth state');
        await redis.del(stateKey);

        // Exchange code for tokens
        interface GoogleTokenResponse {
          access_token: string;
          id_token?: string;
          token_type?: string;
          expires_in?: number;
          scope?: string;
        }

        let tokenResponse: GoogleTokenResponse;
        try {
          tokenResponse = await googleClient.validateAuthorizationCode<GoogleTokenResponse>(code, {
            credentials:       config.GOOGLE_CLIENT_SECRET!,
            authenticateWith: 'request_body',
          });
        } catch (err) {
          logger.error({ err }, 'Google OAuth token exchange failed');
          throw Errors.badRequest('Failed to exchange authorization code');
        }

        // Fetch user profile from Google
        interface GoogleUserInfo {
          id:             string;
          email:          string;
          name:           string;
          picture?:       string;
          verified_email: boolean;
        }

        const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!profileRes.ok) throw Errors.internal('Failed to fetch Google profile');
        const profile = await profileRes.json() as GoogleUserInfo;

        if (!profile.email || !profile.verified_email) {
          throw Errors.badRequest('Google account must have a verified email');
        }

        // Find or create user
        let userId: string;

        const existingOAuth = await db.query.oauthAccounts.findFirst({
          where: and(
            eq(oauthAccounts.provider, 'google'),
            eq(oauthAccounts.providerId, profile.id),
          ),
        });

        if (existingOAuth) {
          userId = existingOAuth.userId;
        } else {
          // Check if email is already registered
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, profile.email),
          });

          if (existingUser) {
            // Link OAuth to existing account
            await db.insert(oauthAccounts).values({
              provider:   'google',
              providerId: profile.id,
              userId:     existingUser.id,
            }).onConflictDoNothing();
            userId = existingUser.id;
          } else {
            // Create new user
            const [newUser] = await db.insert(users).values({
              email:       profile.email,
              displayName: profile.name ?? null,
              avatarUrl:   profile.picture ?? null,
              isGuest:     false,
            }).returning();
            if (!newUser) throw Errors.internal();

            await db.insert(oauthAccounts).values({
              provider:   'google',
              providerId: profile.id,
              userId:     newUser.id,
            });
            await createDefaultsForUser(newUser.id);
            userId = newUser.id;
          }
        }

        const session = await lucia.createSession(userId, {});
        const cookie  = lucia.createSessionCookie(session.id);
        reply.header('Set-Cookie', cookie.serialize());

        // Redirect to the app after successful OAuth
        return reply.redirect(`${config.APP_URL}/#landing`);
      },
    );
  } else {
    // Placeholder routes when Google OAuth is not configured
    fastify.get('/oauth/:provider', async (_req, reply) => {
      return reply.code(503).send({ error: { code: 'OAUTH_NOT_CONFIGURED', message: 'OAuth is not configured on this server' } });
    });
    fastify.get('/oauth/:provider/callback', async (_req, reply) => {
      return reply.code(503).send({ error: { code: 'OAUTH_NOT_CONFIGURED', message: 'OAuth is not configured on this server' } });
    });
  }
}
