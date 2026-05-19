import { eq, and } from 'drizzle-orm';
import archiver from 'archiver';
import { createHash } from 'crypto';
import { PassThrough, Readable } from 'stream';
import type { DB } from '../db/index.js';
import { lessonContent, mediaAssets, lessons } from '../db/schema.js';
import { minio, bundleBucket, downloadBuffer, uploadBuffer, presignGet } from '../lib/minio.js';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import { config } from '../config.js';

const BUNDLE_CACHE_TTL = 3600;

export interface BundleManifestDoc {
  id:         string;
  lesson_id:  string;
  language:   string;
  version:    number;
  title:      string;
  checksum:   string;
  size_bytes: number;
  assets:     string[];
  created_at: string;
}

export async function bundleCacheKey(lessonId: string, language: string): Promise<string> {
  return `bundle:${lessonId}:${language}`;
}

export async function getCachedBundleUrl(lessonId: string, language: string): Promise<string | null> {
  const key = await bundleCacheKey(lessonId, language);
  return redis.get(key);
}

export async function buildLessonBundle(
  lessonId: string,
  language: string,
  db: DB,
): Promise<{ signedUrl: string; version: number }> {
  const lesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });
  if (!lesson) throw new Error(`Lesson ${lessonId} not found`);

  const content = await db.query.lessonContent.findFirst({
    where: and(eq(lessonContent.lessonId, lessonId), eq(lessonContent.language, language)),
  });
  if (!content) throw new Error(`No content for lesson ${lessonId} in ${language}`);

  const media = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.lessonId, lessonId));

  const version = content.version;
  const objectKey = `lessons/${lessonId}/${language}/v${version}.zip`;

  // Build ZIP in memory
  const archive = archiver('zip', { zlib: { level: 6 } });
  const chunks: Buffer[] = [];

  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  const titleStr = typeof lesson.title === 'object' && lesson.title !== null
    ? ((lesson.title as Record<string, string>)[language] ?? (lesson.title as Record<string, string>)['en'] ?? '')
    : '';

  const assetNames: string[] = [];

  for (const asset of media) {
    const assetKey = asset.compressedKey ?? asset.storageKey;
    try {
      const buf  = await downloadBuffer(config.MINIO_BUCKET_MEDIA, assetKey);
      const name = `assets/${asset.filename}`;
      archive.append(buf, { name });
      assetNames.push(name);
    } catch (err) {
      logger.warn({ err, assetKey }, 'Could not include asset in bundle');
    }
  }

  if (content.bodyHtml) archive.append(content.bodyHtml, { name: 'content.html' });
  if (content.bodyText) archive.append(content.bodyText, { name: 'content.txt' });

  if (content.audioUrl) {
    try {
      const audioBuf = await downloadBuffer(config.MINIO_BUCKET_MEDIA, content.audioUrl);
      archive.append(audioBuf, { name: 'audio.mp3' });
      assetNames.push('audio.mp3');
    } catch { /* skip */ }
  }

  if (content.slidesUrl) {
    try {
      const slidesBuf = await downloadBuffer(config.MINIO_BUCKET_MEDIA, content.slidesUrl);
      archive.append(slidesBuf, { name: 'slides.pdf' });
      assetNames.push('slides.pdf');
    } catch { /* skip */ }
  }

  await new Promise<void>((resolve, reject) => {
    archive.on('error', reject);
    archive.on('end', resolve);
    archive.finalize();
  });

  const zipBuffer = Buffer.concat(chunks);
  const checksum  = createHash('sha256').update(zipBuffer).digest('hex');
  const sizeBytes = zipBuffer.length;

  const manifest: BundleManifestDoc = {
    id:         lessonId,
    lesson_id:  lessonId,
    language,
    version,
    title:      titleStr,
    checksum:   `sha256:${checksum}`,
    size_bytes: sizeBytes,
    assets:     assetNames,
    created_at: new Date().toISOString(),
  };

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  await uploadBuffer(bundleBucket(), objectKey, zipBuffer, 'application/zip');

  // Update DB checksum
  await db
    .update(lessonContent)
    .set({ checksum: `sha256:${checksum}`, sizeBytes })
    .where(and(eq(lessonContent.lessonId, lessonId), eq(lessonContent.language, language)));

  const signedUrl = await presignGet(bundleBucket(), objectKey);
  const cacheKey  = await bundleCacheKey(lessonId, language);
  await redis.set(cacheKey, signedUrl, 'EX', BUNDLE_CACHE_TTL);

  return { signedUrl, version };
}
