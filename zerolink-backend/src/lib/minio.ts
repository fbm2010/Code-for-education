import { Client as MinioClient } from 'minio';
import { config } from '../config.js';
import { logger } from './logger.js';

export const minio = new MinioClient({
  endPoint:  config.MINIO_ENDPOINT,
  port:      config.MINIO_PORT,
  useSSL:    config.MINIO_USE_SSL,
  accessKey: config.MINIO_ACCESS_KEY,
  secretKey: config.MINIO_SECRET_KEY,
});

const PRESIGN_TTL = 3600; // 1 hour

/** Ensure required buckets exist on startup */
export async function ensureBuckets(): Promise<void> {
  const buckets = [config.MINIO_BUCKET_MEDIA, config.MINIO_BUCKET_BUNDLES];
  for (const bucket of buckets) {
    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket, 'us-east-1');
      logger.info({ bucket }, 'Created MinIO bucket');
    }
  }
}

/** Generate a presigned GET URL (for CDN-bypassed direct access) */
export async function presignGet(bucket: string, objectKey: string): Promise<string> {
  return minio.presignedGetObject(bucket, objectKey, PRESIGN_TTL);
}

/** Generate a presigned PUT URL for client-side uploads */
export async function presignPut(bucket: string, objectKey: string): Promise<string> {
  return minio.presignedPutObject(bucket, objectKey, PRESIGN_TTL);
}

/** Upload a buffer directly from the server */
export async function uploadBuffer(
  bucket: string,
  objectKey: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  await minio.putObject(bucket, objectKey, data, data.length, { 'Content-Type': contentType });
}

/** Download an object as a Buffer */
export async function downloadBuffer(bucket: string, objectKey: string): Promise<Buffer> {
  const stream = await minio.getObject(bucket, objectKey);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end',  () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/** Remove an object */
export async function removeObject(bucket: string, objectKey: string): Promise<void> {
  await minio.removeObject(bucket, objectKey);
}

export function mediaBucket()   { return config.MINIO_BUCKET_MEDIA;   }
export function bundleBucket()  { return config.MINIO_BUCKET_BUNDLES; }
