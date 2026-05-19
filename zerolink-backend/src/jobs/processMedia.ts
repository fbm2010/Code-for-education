import { Worker } from 'bullmq';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { bullConnection } from '../lib/queues.js';
import { downloadBuffer, uploadBuffer, mediaBucket } from '../lib/minio.js';
import { db } from '../db/index.js';
import { mediaAssets } from '../db/schema.js';
import { logger } from '../lib/logger.js';

interface MediaJobData {
  asset_id:    string;
  storage_key: string;
  mime_type:   string;
}

export function startMediaWorker(): Worker<MediaJobData> {
  const worker = new Worker<MediaJobData>(
    'media',
    async (job) => {
      const { asset_id, storage_key, mime_type } = job.data;

      if (mime_type.startsWith('video/')) {
        logger.info({ asset_id }, 'Video transcoding not yet implemented — skipping');
        return;
      }

      if (!mime_type.startsWith('image/')) {
        logger.info({ asset_id, mime_type }, 'Skipping non-image asset');
        return;
      }

      logger.info({ asset_id, storage_key }, 'Compressing image');

      const original    = await downloadBuffer(mediaBucket(), storage_key);
      const compressed  = await sharp(original)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 65 })
        .toBuffer();

      const compressedKey = `${storage_key}-compressed.webp`;
      await uploadBuffer(mediaBucket(), compressedKey, compressed, 'image/webp');

      await db
        .update(mediaAssets)
        .set({ compressedKey, processed: true })
        .where(eq(mediaAssets.id, asset_id));

      logger.info({ asset_id, compressedKey }, 'Image compressed');
    },
    { connection: bullConnection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Media job failed');
  });

  return worker;
}
