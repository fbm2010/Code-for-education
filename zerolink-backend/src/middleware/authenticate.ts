import type { FastifyRequest, FastifyReply } from 'fastify';
import { lucia } from '../lib/lucia.js';

/**
 * Prehandler: validates the session cookie and attaches `request.user`
 * and `request.session`. Returns 401 if the session is missing or invalid.
 */
export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? '');

  if (!sessionId) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const { session, user } = await lucia.validateSession(sessionId);

  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie();
    reply.header('Set-Cookie', blankCookie.serialize());
    reply.code(401).send({ error: { code: 'SESSION_EXPIRED', message: 'Session expired — please log in again' } });
    return;
  }

  // Rotate cookie if session was freshly extended
  if (session.fresh) {
    const newCookie = lucia.createSessionCookie(session.id);
    reply.header('Set-Cookie', newCookie.serialize());
  }

  // Attach to request so route handlers can access them
  (req as any).user    = user;
  (req as any).session = session;
  (req as any).userId  = user.id;
}

/**
 * Soft auth: same as authenticate but does NOT reject — instead it
 * attaches user/session if valid, or leaves them undefined.
 * Used for routes that behave differently for logged-in vs guest users.
 */
export async function softAuthenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? '');
  if (!sessionId) return;

  const { session, user } = await lucia.validateSession(sessionId);
  if (session && user) {
    (req as any).user    = user;
    (req as any).session = session;
    (req as any).userId  = user.id;
  }
}
