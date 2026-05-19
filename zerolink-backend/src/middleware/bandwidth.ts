import type { FastifyInstance } from 'fastify';

export function registerBandwidthHook(fastify: FastifyInstance): void {
  fastify.addHook('preHandler', async (req) => {
    req.isLowBandwidth = req.headers['x-zerolink-bandwidth'] === 'low';
    req.bandwidthMode  = req.isLowBandwidth ? 'low' : 'normal';
  });
}
