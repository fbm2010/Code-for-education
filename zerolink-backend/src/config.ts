import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT:     z.coerce.number().default(3000),

  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  SESSION_SECRET:   z.string().min(32),
  SESSION_TTL_DAYS: z.coerce.number().default(30),

  MINIO_ENDPOINT:       z.string().default('localhost'),
  MINIO_PORT:           z.coerce.number().default(9000),
  MINIO_ACCESS_KEY:     z.string().default('zerolink'),
  MINIO_SECRET_KEY:     z.string().default('zerolink_secret'),
  MINIO_BUCKET_MEDIA:   z.string().default('zerolink-media'),
  MINIO_BUCKET_BUNDLES: z.string().default('zerolink-bundles'),
  MINIO_USE_SSL:        z.preprocess(v => v === 'true' || v === true, z.boolean()).default(false),

  CDN_BASE_URL: z.string().default('http://localhost:9000/zerolink-media'),

  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  LIBRETRANSLATE_URL:     z.string().url().default('http://localhost:5000'),
  LIBRETRANSLATE_API_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),

  SYNC_ENCRYPTION_KEY: z.string().min(32).default('00000000000000000000000000000000'),

  RATE_LIMIT_MAX:             z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS:       z.coerce.number().default(60_000),
  AUTH_RATE_LIMIT_MAX:        z.coerce.number().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS:  z.coerce.number().default(900_000),
});

function parseConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const [field, issues] of Object.entries(result.error.flatten().fieldErrors)) {
      console.error(`  ${field}: ${issues?.join(', ')}`);
    }
    process.exit(1);
  }
  return result.data;
}

export const config = parseConfig();
export type Config = typeof config;
