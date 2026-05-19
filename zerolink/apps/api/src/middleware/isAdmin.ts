import type { FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from './authenticate.js';

export async function isAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authenticate(req, reply);
  if (reply.sent) return;

  const user = (req as FastifyRequest & { user?: { role: string } }).user;
  if (!user || user.role !== 'admin') {
    reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
  }
}
