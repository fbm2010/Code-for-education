import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { lucia } from '../lib/lucia.js';
import { db } from '../db/index.js';
import { users, userPreferences, studyStreaks, oauthAccounts } from '../db/schema.js';
import { authenticate } from '../middleware/authenticate.js';
import { AppError, Errors } from '../lib/errors.js';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { sendMail } from '../lib/mailer.js';

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

const GoogleCallbackQuery = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
});

type GoogleTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

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

function googleRedirectUri(): string {
  // In GitHub Codespaces the Codespaces tunnel strips cookies from cross-port
  // XHR, so the OAuth callback must flow through the frontend Vite proxy
  // (APP_URL/5174) instead of directly to the API port (API_URL/3000).
  // We detect Codespaces by the .app.github.dev hostname pattern.
  const isCodespaces = config.APP_URL.includes('.app.github.dev');
  const base = isCodespaces ? config.APP_URL : config.API_URL;
  return `${base}/v1/auth/oauth/google/callback`;
}


function loginRedirect(reason?: string): string {
  const url = new URL('/login', config.APP_URL);
  if (reason) url.searchParams.set('oauth_error', reason);
  return url.toString();
}

function setOauthStateCookie(reply: FastifyReply, state: string): void {
  reply.header('Set-Cookie', `google_oauth_state=${encodeURIComponent(state)}; HttpOnly; Path=/v1/auth/oauth/google; Max-Age=600; SameSite=Lax`);
}

function clearOauthStateCookie(): string {
  return 'google_oauth_state=; HttpOnly; Path=/v1/auth/oauth/google; Max-Age=0; SameSite=Lax';
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const cookies = header.split(';').map(part => part.trim());
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

function serializeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.isGuest ? 'guest' : user.role,
    isGuest: user.isGuest,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

async function sendVerificationEmail(user: typeof users.$inferSelect): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

  await db.update(users).set({ verificationToken: token, verificationExpiry: expiry }).where(eq(users.id, user.id));

  const link = `${config.APP_URL}/verify-email?token=${token}`;
  await sendMail({
    to: user.email!,
    subject: 'Verify your ZeroLink email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#5a3e1b">Welcome to ZeroLink, ${user.displayName ?? 'Explorer'}!</h2>
        <p>Click the button below to verify your email address. The link expires in 24 hours.</p>
        <a href="${link}" style="display:inline-block;background:#c08040;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Verify Email →
        </a>
        <p style="color:#999;font-size:12px">If you didn't register, ignore this email.</p>
      </div>
    `,
    text: `Verify your ZeroLink email: ${link}`,
  });
}

async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: config.GOOGLE_CLIENT_ID ?? '',
    client_secret: config.GOOGLE_CLIENT_SECRET ?? '',
    redirect_uri: googleRedirectUri(),
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  return await res.json() as GoogleTokenResponse;
}

async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw Errors.unauthorized('Could not read Google profile');
  return await res.json() as GoogleUserInfo;
}

async function findOrCreateGoogleUser(profile: GoogleUserInfo): Promise<typeof users.$inferSelect> {
  const linkedAccount = await db.query.oauthAccounts.findFirst({
    where: and(eq(oauthAccounts.provider, 'google'), eq(oauthAccounts.providerId, profile.sub)),
  });

  if (linkedAccount) {
    const linkedUser = await db.query.users.findFirst({ where: and(eq(users.id, linkedAccount.userId), isNull(users.deletedAt)) });
    if (linkedUser) return linkedUser;
  }

  const existingUser = profile.email
    ? await db.query.users.findFirst({ where: and(eq(users.email, profile.email), isNull(users.deletedAt)) })
    : null;

  if (existingUser) {
    await db.insert(oauthAccounts).values({ provider: 'google', providerId: profile.sub, userId: existingUser.id }).onConflictDoNothing();
    return existingUser;
  }

  const [createdUser] = await db.insert(users).values({
    email: profile.email ?? null,
    displayName: profile.name ?? profile.email?.split('@')[0] ?? 'Google user',
    avatarUrl: profile.picture ?? null,
    isGuest: false,
  }).returning();

  if (!createdUser) throw Errors.internal();

  await createDefaultsForUser(createdUser.id);
  await db.insert(oauthAccounts).values({ provider: 'google', providerId: profile.sub, userId: createdUser.id }).onConflictDoNothing();

  return createdUser;
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

  // GET /auth/oauth/google
  fastify.get('/oauth/google', async (_req, reply) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return reply.redirect(loginRedirect('google_not_configured'));
    }

    const state = crypto.randomUUID();
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', googleRedirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');

    setOauthStateCookie(reply, state);
    return reply.redirect(url.toString());
  });

  // GET /auth/oauth/google/callback
  fastify.get<{ Querystring: z.infer<typeof GoogleCallbackQuery> }>('/oauth/google/callback', async (req, reply) => {
    const query = GoogleCallbackQuery.safeParse(req.query);
    if (!query.success) return reply.redirect(loginRedirect('invalid_google_response'));
    if (query.data.error) return reply.redirect(loginRedirect(query.data.error));

    const expectedState = readCookie(req.headers.cookie, 'google_oauth_state');
    if (!query.data.code || !query.data.state || !expectedState || query.data.state !== expectedState) {
      reply.header('Set-Cookie', clearOauthStateCookie());
      return reply.redirect(loginRedirect('invalid_google_state'));
    }

    try {
      const token = await exchangeGoogleCode(query.data.code);
      if (!token.access_token) {
        logger.warn({ error: token.error, description: token.error_description }, 'Google token exchange failed');
        reply.header('Set-Cookie', clearOauthStateCookie());
        return reply.redirect(loginRedirect('google_token_failed'));
      }

      const profile = await fetchGoogleUserInfo(token.access_token);
      if (!profile.sub) {
        reply.header('Set-Cookie', clearOauthStateCookie());
        return reply.redirect(loginRedirect('google_profile_failed'));
      }

      const user = await findOrCreateGoogleUser(profile);
      const session = await lucia.createSession(user.id, {});
      const cookie = lucia.createSessionCookie(session.id);

      reply.header('Set-Cookie', [cookie.serialize(), clearOauthStateCookie()]);
      return reply.redirect(new URL('/dashboard', config.APP_URL).toString());
    } catch (err) {
      logger.warn({ err }, 'Google OAuth callback failed');
      reply.header('Set-Cookie', clearOauthStateCookie());
      return reply.redirect(loginRedirect('google_signin_failed'));
    }
  });

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

      // Send verification email (non-blocking — don't fail registration if email fails)
      if (user.email) {
        void sendVerificationEmail(user).catch(err => logger.warn({ err }, 'Failed to send verification email'));
      }

      const session    = await lucia.createSession(user.id, {});
      const cookie     = lucia.createSessionCookie(session.id);
      reply.header('Set-Cookie', cookie.serialize());

      return respond(reply, { user: serializeUser(user) }, 201, req.id);
    },
  );

  // GET /auth/verify-email?token=<token>
  fastify.get<{ Querystring: { token?: string } }>('/verify-email', async (req, reply) => {
    const { token } = req.query;
    if (!token) return reply.redirect(`${config.APP_URL}/login?verified=error`);

    const user = await db.query.users.findFirst({
      where: and(
        eq(users.verificationToken, token),
        gt(users.verificationExpiry, new Date()),
      ),
    });

    if (!user) return reply.redirect(`${config.APP_URL}/login?verified=expired`);

    await db.update(users)
      .set({ emailVerified: true, verificationToken: null, verificationExpiry: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return reply.redirect(`${config.APP_URL}/login?verified=true`);
  });

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

      return respond(reply, { user: serializeUser(user) }, 200, req.id);
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

    return respond(reply, { user: serializeUser(user) }, 201, req.id);
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

      if (!updated) throw Errors.internal();
      return respond(reply, { user: serializeUser(updated) }, 200, req.id);
    },
  );
}
