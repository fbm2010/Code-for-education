import { eq, gt, and, inArray } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import {
  lessonProgress, srCards, dailyPlans, quizAttempts, syncRecords,
} from '../db/schema.js';
import type { SyncConflict } from '../types/index.js';

const ALLOWED_TABLES = ['lesson_progress', 'sr_cards', 'daily_plans', 'quiz_attempts'] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

export interface SyncPushRecord {
  table:            string;
  record_id:        string;
  operation:        'insert' | 'update' | 'delete';
  payload:          Record<string, unknown>;
  client_timestamp: string;
}

function isAllowedTable(t: string): t is AllowedTable {
  return (ALLOWED_TABLES as readonly string[]).includes(t);
}

async function applyLessonProgress(
  userId: string,
  rec: SyncPushRecord,
  db: DB,
): Promise<SyncConflict | null> {
  const { record_id, payload, client_timestamp } = rec;
  const clientTs = new Date(client_timestamp);

  const existing = await db.query.lessonProgress.findFirst({
    where: eq(lessonProgress.id, record_id),
  });

  if (existing && new Date(existing.updatedAt) > clientTs) {
    return {
      record_id,
      table:        'lesson_progress',
      server_value: existing,
      client_value: payload,
      resolution:   'server_wins',
    };
  }

  if (rec.operation === 'delete') {
    return null; // ignore deletes for progress
  }

  if (!existing && rec.operation === 'update') {
    return {
      record_id,
      table:        'lesson_progress',
      server_value: null,
      client_value: payload,
      resolution:   'server_wins',
    };
  }

  if (existing) {
    await db
      .update(lessonProgress)
      .set({
        status:          (payload['status'] as 'not_started' | 'in_progress' | 'completed' | undefined) ?? existing.status,
        percentComplete: (payload['percent_complete'] as number | undefined) ?? existing.percentComplete,
        timeSpentSec:    (payload['time_spent_sec'] as number | undefined) ?? existing.timeSpentSec,
        lastAccessed:    new Date(client_timestamp),
        updatedAt:       new Date(),
      })
      .where(eq(lessonProgress.id, record_id));
  } else {
    await db.insert(lessonProgress).values({
      id:              record_id,
      userId,
      lessonId:        payload['lesson_id'] as string,
      status:          (payload['status'] as 'not_started' | 'in_progress' | 'completed' | undefined) ?? 'not_started',
      percentComplete: (payload['percent_complete'] as number | undefined) ?? 0,
      timeSpentSec:    (payload['time_spent_sec'] as number | undefined) ?? 0,
      lastAccessed:    new Date(client_timestamp),
    }).onConflictDoNothing();
  }

  return null;
}

async function applySrCard(
  userId: string,
  rec: SyncPushRecord,
  db: DB,
): Promise<SyncConflict | null> {
  const { record_id, payload, client_timestamp } = rec;

  const existing = await db.query.srCards.findFirst({
    where: eq(srCards.id, record_id),
  });

  if (existing && rec.operation !== 'insert') {
    const serverNextReview = new Date(existing.nextReview + 'T00:00:00Z');
    const clientNextReview = new Date((payload['next_review'] as string) + 'T00:00:00Z');

    // Take the lower (more conservative) next_review date
    if (serverNextReview <= clientNextReview) {
      return {
        record_id,
        table:        'sr_cards',
        server_value: existing,
        client_value: payload,
        resolution:   'server_wins',
      };
    }

    await db
      .update(srCards)
      .set({
        easeFactor:   (payload['ease_factor'] as number | undefined) ?? existing.easeFactor,
        intervalDays: (payload['interval_days'] as number | undefined) ?? existing.intervalDays,
        repetitions:  (payload['repetitions'] as number | undefined) ?? existing.repetitions,
        nextReview:   payload['next_review'] as string,
        lastReviewed: new Date(client_timestamp),
        updatedAt:    new Date(),
      })
      .where(eq(srCards.id, record_id));
  } else if (!existing) {
    await db.insert(srCards).values({
      id:           record_id,
      userId,
      lessonId:     payload['lesson_id'] as string,
      term:         payload['term'] as { front: string; back: string; language: string },
      easeFactor:   (payload['ease_factor'] as number | undefined) ?? 2.5,
      intervalDays: (payload['interval_days'] as number | undefined) ?? 1,
      repetitions:  (payload['repetitions'] as number | undefined) ?? 0,
      nextReview:   payload['next_review'] as string,
    }).onConflictDoNothing();
  }

  return null;
}

async function applyQuizAttempt(
  userId: string,
  rec: SyncPushRecord,
  db: DB,
): Promise<null> {
  // Append-only
  const { record_id, payload } = rec;
  await db.insert(quizAttempts).values({
    id:          record_id,
    userId,
    quizId:      payload['quiz_id'] as string,
    lessonId:    (payload['lesson_id'] as string | undefined) ?? null,
    answers:     payload['answers'] as Record<string, string>,
    score:       payload['score'] as number,
    durationSec: (payload['duration_sec'] as number | undefined) ?? null,
    attemptedAt: new Date(rec.client_timestamp),
  }).onConflictDoNothing();
  return null;
}

export async function processSyncPush(
  userId: string,
  deviceId: string,
  records: SyncPushRecord[],
  db: DB,
): Promise<{ accepted: string[]; conflicts: SyncConflict[] }> {
  const accepted:  string[]        = [];
  const conflicts: SyncConflict[]  = [];

  for (const rec of records) {
    if (!isAllowedTable(rec.table)) {
      conflicts.push({
        record_id:    rec.record_id,
        table:        rec.table,
        server_value: null,
        client_value: rec.payload,
        resolution:   'server_wins',
      });
      continue;
    }

    let conflict: SyncConflict | null = null;

    if (rec.table === 'lesson_progress') {
      conflict = await applyLessonProgress(userId, rec, db);
    } else if (rec.table === 'sr_cards') {
      conflict = await applySrCard(userId, rec, db);
    } else if (rec.table === 'quiz_attempts') {
      conflict = await applyQuizAttempt(userId, rec, db);
    } else if (rec.table === 'daily_plans') {
      // Server wins for daily_plans
      conflict = { record_id: rec.record_id, table: 'daily_plans', server_value: null, client_value: rec.payload, resolution: 'server_wins' };
    }

    await db.insert(syncRecords).values({
      userId,
      deviceId,
      tableName: rec.table,
      recordId:  rec.record_id,
      operation: rec.operation,
      payload:   rec.payload,
    });

    if (conflict) {
      conflicts.push(conflict);
    } else {
      accepted.push(rec.record_id);
    }
  }

  return { accepted, conflicts };
}

export async function pullChanges(
  userId: string,
  since: Date,
  tables: string[],
  db: DB,
): Promise<Record<string, unknown[]>> {
  const result: Record<string, unknown[]> = {};

  for (const table of tables) {
    if (!isAllowedTable(table)) continue;

    if (table === 'lesson_progress') {
      result[table] = await db
        .select()
        .from(lessonProgress)
        .where(and(eq(lessonProgress.userId, userId), gt(lessonProgress.updatedAt, since)));
    } else if (table === 'sr_cards') {
      result[table] = await db
        .select()
        .from(srCards)
        .where(and(eq(srCards.userId, userId), gt(srCards.updatedAt, since)));
    } else if (table === 'daily_plans') {
      result[table] = await db
        .select()
        .from(dailyPlans)
        .where(and(eq(dailyPlans.userId, userId), gt(dailyPlans.generatedAt, since)));
    } else if (table === 'quiz_attempts') {
      result[table] = await db
        .select()
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), gt(quizAttempts.attemptedAt, since)));
    }
  }

  return result;
}
