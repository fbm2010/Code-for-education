import { Redis as IORedis } from 'ioredis';
import { Queue } from 'bullmq';
import { config } from '../config.js';

// BullMQ requires maxRetriesPerRequest: null
export const bullConnection = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const bundleQueue      = new Queue('bundles',      { connection: bullConnection });
export const mediaQueue       = new Queue('media',        { connection: bullConnection });
export const adminQueue       = new Queue('admin',        { connection: bullConnection });
export const translationQueue = new Queue('translations', { connection: bullConnection });
