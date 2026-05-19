import { eq } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import { studyStreaks, studyEvents } from '../db/schema.js';

function todayInTz(timezone: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone:  timezone,
      year:      'numeric',
      month:     '2-digit',
      day:       '2-digit',
    }).formatToParts(now);

    const y = parts.find(p => p.type === 'year')?.value ?? '';
    const m = parts.find(p => p.type === 'month')?.value ?? '';
    const d = parts.find(p => p.type === 'day')?.value ?? '';
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().split('T')[0] ?? '';
  }
}

function subtractOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0] ?? '';
}

export async function recordStudySession(
  userId: string,
  db: DB,
  timezone = 'UTC',
): Promise<void> {
  const today = todayInTz(timezone);

  const streak = await db.query.studyStreaks.findFirst({
    where: eq(studyStreaks.userId, userId),
  });

  if (!streak) {
    await db.insert(studyStreaks).values({
      userId,
      currentStreak:  1,
      longestStreak:  1,
      lastStudyDate:  today,
    });
    return;
  }

  if (streak.lastStudyDate === today) return;

  const yesterday  = subtractOneDay(today);
  const newCurrent = streak.lastStudyDate === yesterday ? streak.currentStreak + 1 : 1;
  const newLongest = Math.max(newCurrent, streak.longestStreak);

  await db
    .update(studyStreaks)
    .set({ currentStreak: newCurrent, longestStreak: newLongest, lastStudyDate: today })
    .where(eq(studyStreaks.userId, userId));
}

export async function logStudyEvent(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
  db: DB,
): Promise<void> {
  await db.insert(studyEvents).values({ userId, eventType, payload });
}
