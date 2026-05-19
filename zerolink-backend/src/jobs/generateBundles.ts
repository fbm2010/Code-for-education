import { Worker } from 'bullmq';
import { bullConnection } from '../lib/queues.js';
import { buildLessonBundle } from '../services/bundleService.js';
import { db } from '../db/index.js';
import { logger } from '../lib/logger.js';

interface BundleJobData {
  lesson_id: string;
  language:  string;
}

export function startBundleWorker(): Worker<BundleJobData> {
  const worker = new Worker<BundleJobData>(
    'bundles',
    async (job) => {
      const { lesson_id, language } = job.data;
      logger.info({ lesson_id, language }, 'Generating bundle');
      const result = await buildLessonBundle(lesson_id, language, db);
      logger.info({ lesson_id, language, version: result.version }, 'Bundle generated');
      return result;
    },
    {
      connection: bullConnection,
      concurrency: 3,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Bundle job failed');
  });

  return worker;
}
