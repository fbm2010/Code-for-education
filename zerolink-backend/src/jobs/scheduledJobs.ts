import cron from 'node-cron';
import { lt, eq, and, lte, gte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { redis } from '../lib/redis.js';
import { sessions, users, lessonContent, dailyPlans, studyEvents, dailySummaries, teacherPacks, resources } from '../db/schema.js';
import { generateDailyPlan } from '../services/studyCoach.js';
import { bundleQueue } from '../lib/queues.js';
import { minio, bundleBucket } from '../lib/minio.js';
import { logger } from '../lib/logger.js';

function todayStr(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0] ?? '';
}

export function registerCronJobs(): void {
  // Generate daily plans for all active users (midnight UTC)
  cron.schedule('0 0 * * *', async () => {
    logger.info('cron:generate-daily-plans starting');
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 14);

      const activeUsers = await db
        .selectDistinct({ userId: studyEvents.userId })
        .from(studyEvents)
        .where(gte(studyEvents.createdAt, cutoff));

      for (const { userId } of activeUsers) {
        try {
          await generateDailyPlan(userId, db, redis);
        } catch (err) {
          logger.error({ userId, err }, 'Failed to generate daily plan');
        }
      }
      logger.info({ count: activeUsers.length }, 'cron:generate-daily-plans done');
    } catch (err) {
      logger.error({ err }, 'cron:generate-daily-plans failed');
    }
  });

  // Cleanup expired sessions (3am UTC)
  cron.schedule('0 3 * * *', async () => {
    logger.info('cron:cleanup-sessions starting');
    try {
      const deleted = await db
        .delete(sessions)
        .where(lt(sessions.expiresAt, new Date()));
      logger.info('cron:cleanup-sessions done');
    } catch (err) {
      logger.error({ err }, 'cron:cleanup-sessions failed');
    }
  });

  // Streak maintenance (5 minutes past midnight UTC)
  cron.schedule('5 0 * * *', async () => {
    logger.info('cron:streak-maintenance starting');
    // Streaks reset only when a new session is recorded after a gap.
    // Here we only log — no resets.
    logger.info('cron:streak-maintenance done (no-op — streaks reset lazily)');
  });

  // Bundle stale check (weekly Monday 2am)
  cron.schedule('0 2 * * 1', async () => {
    logger.info('cron:bundle-stale-check starting');
    try {
      const allContent = await db.select().from(lessonContent).where(eq(lessonContent.published, true));

      for (const content of allContent) {
        const objectKey = `lessons/${content.lessonId}/${content.language}/v${content.version}.zip`;
        try {
          await minio.statObject(bundleBucket(), objectKey);
        } catch {
          // Object missing — re-enqueue
          await bundleQueue.add('generate-bundle', {
            lesson_id: content.lessonId,
            language:  content.language,
          });
          logger.info({ lesson_id: content.lessonId, language: content.language }, 'Re-queued stale bundle');
        }
      }
      logger.info('cron:bundle-stale-check done');
    } catch (err) {
      logger.error({ err }, 'cron:bundle-stale-check failed');
    }
  });

  // Resource & teacher-pack URL verification (weekly Sunday 4am)
  cron.schedule('0 4 * * 0', async () => {
    logger.info('cron:resource-verification starting');
    try {
      // Verify teacher pack bundle URLs
      const packs = await db
        .select({ id: teacherPacks.id, title: teacherPacks.title, bundleUrl: teacherPacks.bundleUrl })
        .from(teacherPacks)
        .where(eq(teacherPacks.approved, true));

      let dead = 0;
      for (const pack of packs) {
        if (!pack.bundleUrl) continue;
        try {
          const res = await fetch(pack.bundleUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
          if (!res.ok) {
            logger.warn({ packId: pack.id, title: pack.title, status: res.status }, 'Teacher pack URL unreachable');
            dead++;
          }
        } catch (err) {
          logger.warn({ packId: pack.id, title: pack.title, err }, 'Teacher pack URL fetch failed');
          dead++;
        }
      }

      logger.info({ checked: packs.length, dead }, 'cron:resource-verification done');
    } catch (err) {
      logger.error({ err }, 'cron:resource-verification failed');
    }
  });

  // Analytics rollup (1:30am UTC)
  cron.schedule('30 1 * * *', async () => {
    logger.info('cron:analytics-rollup starting');
    try {
      const yesterday = yesterdayStr();
      const dayStart  = new Date(yesterday + 'T00:00:00Z');
      const dayEnd    = new Date(yesterday + 'T23:59:59Z');

      const events = await db
        .select()
        .from(studyEvents)
        .where(and(gte(studyEvents.createdAt, dayStart), lte(studyEvents.createdAt, dayEnd)));

      const byUser: Record<string, { events: number; minutes: number; lessons: number; sr: number }> = {};

      for (const ev of events) {
        const bucket = (byUser[ev.userId] ??= { events: 0, minutes: 0, lessons: 0, sr: 0 });
        bucket.events++;
        if (ev.eventType === 'session_end') {
          bucket.minutes += (ev.payload?.['duration_min'] as number | undefined) ?? 0;
        }
        if (ev.eventType === 'lesson_complete') bucket.lessons++;
        if (ev.eventType === 'sr_review') bucket.sr++;
      }

      for (const [userId, stats] of Object.entries(byUser)) {
        await db
          .insert(dailySummaries)
          .values({
            userId,
            date:             yesterday,
            eventsCount:      stats.events,
            minutesStudied:   Math.round(stats.minutes),
            lessonsCompleted: stats.lessons,
            srReviews:        stats.sr,
          })
          .onConflictDoNothing();
      }

      logger.info({ users: Object.keys(byUser).length }, 'cron:analytics-rollup done');
    } catch (err) {
      logger.error({ err }, 'cron:analytics-rollup failed');
    }
  });
}
