import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { config } from '../config.js';
import * as schema from './schema.js';

const queryClient = postgres(config.DATABASE_URL, {
  max:         20,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare:     false,  // required for PgBouncer compatibility
});

export const db = drizzle(queryClient, { schema, logger: config.NODE_ENV === 'development' });

export type DB = typeof db;
