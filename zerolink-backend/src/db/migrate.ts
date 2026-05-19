/**
 * Runs the generated migration SQL directly via psql or postgres connection.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

async function migrate() {
  const sql = postgres(config.DATABASE_URL, { max: 1 });

  // Enable extensions
  await sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`;
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Applying migration: ${file}`);
    const content = readFileSync(join(migrationsDir, file), 'utf-8');

    // Split by statement-breakpoint
    const statements = content
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          console.log(`  Skipped (already exists)`);
        } else {
          console.error(`  Error: ${msg}`);
          throw err;
        }
      }
    }
    console.log(`  ✓ ${file}`);
  }

  await sql.end();
  console.log('✅ Migrations complete');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
