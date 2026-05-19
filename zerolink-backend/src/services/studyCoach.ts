import { eq, lte, gte, avg, and, lt, desc, ne } from 'drizzle-orm';
import type { DB } from '../db/index.js';
import type { Redis } from 'ioredis';
import {
  srCards, quizAttempts, lessonProgress, dailyPlans,
  userPreferences, enrollments, lessons,
} from '../db/schema.js';
import type { DailyPlanTask } from '../db/schema.js';
import { resolveI18n } from './i18nService.js';

function todayStr(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function taskId(idx: number): string {
  return `t${idx + 1}`;
}

export async function getWeakLessons(userId: string, db: DB): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const attempts = await db
    .select({ lessonId: quizAttempts.lessonId, score: quizAttempts.score })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.userId, userId),
        gte(quizAttempts.attemptedAt, cutoff),
      ),
    );

  const byLesson: Record<string, number[]> = {};
  for (const a of attempts) {
    if (!a.lessonId) continue;
    (byLesson[a.lessonId] ??= []).push(a.score);
  }

  return Object.entries(byLesson)
    .map(([id, scores]) => ({
      id,
      avg: scores.reduce((s, x) => s + x, 0) / scores.length,
    }))
    .filter(x => x.avg < 0.7)
    .sort((a, b) => a.avg - b.avg)
    .map(x => x.id);
}

export async function getInterleavingCandidate(
  userId: string,
  db: DB,
): Promise<string | null> {
  const inProgress = await db
    .select({
      lessonId:     lessonProgress.lessonId,
      lastAccessed: lessonProgress.lastAccessed,
    })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, 'in_progress'),
      ),
    )
    .orderBy(lessonProgress.lastAccessed);

  if (inProgress.length < 2) return null;

  const oldest = inProgress[0];
  return oldest?.lessonId ?? null;
}

export async function getNextLesson(userId: string, db: DB): Promise<string | null> {
  const enrolled = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));

  if (enrolled.length === 0) return null;

  const courseIds = enrolled.map(e => e.courseId);

  const started = await db
    .select({ lessonId: lessonProgress.lessonId })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));

  const startedIds = new Set(started.map(p => p.lessonId));

  for (const courseId of courseIds) {
    const allLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.courseId, courseId), eq(lessons.published, true)))
      .orderBy(lessons.sortOrder);

    const next = allLessons.find(l => !startedIds.has(l.id));
    if (next) return next.id;
  }

  return null;
}

export async function generateDailyPlan(
  userId: string,
  db: DB,
  _redis: Redis,
): Promise<DailyPlanTask[]> {
  const today = todayStr();

  const existing = await db.query.dailyPlans.findFirst({
    where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)),
  });
  if (existing) return existing.tasks;

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });

  const budget        = prefs?.dailyStudyMinutes ?? 30;
  const lang          = prefs?.primaryLanguage ?? 'en';
  const techniques    = prefs?.preferredTechniques ?? ['spaced_repetition'];
  let   remaining     = budget;
  const tasks: DailyPlanTask[] = [];

  // Priority 1: SR cards due
  const dueCards = await db
    .select({ id: srCards.id })
    .from(srCards)
    .where(
      and(
        eq(srCards.userId, userId),
        lte(srCards.nextReview, today),
      ),
    );

  if (dueCards.length > 0) {
    const dur = Math.min(Math.ceil(dueCards.length * 0.5), 10, remaining);
    if (dur > 0) {
      const desc = { en: `Review ${dueCards.length} flashcard${dueCards.length > 1 ? 's' : ''}`, sw: `Kagua kadi ${dueCards.length}` };
      tasks.push({
        id:           taskId(tasks.length),
        type:         'review_sr',
        lesson_id:    '',
        description:  { [lang]: resolveI18n(desc, lang) },
        duration_min: dur,
        completed:    false,
      });
      remaining -= dur;
    }
  }

  // Priority 2: Weak lesson retrieval quiz
  if (remaining > 0) {
    const weak = await getWeakLessons(userId, db);
    const weakId = weak[0];
    if (weakId) {
      const dur = Math.min(10, remaining);
      const desc = { en: 'Practice quiz — reinforce weak area', sw: 'Jaribio la mazoezi — imarisha eneo dhaifu' };
      tasks.push({
        id:           taskId(tasks.length),
        type:         'retrieval_quiz',
        lesson_id:    weakId,
        description:  { [lang]: resolveI18n(desc, lang) },
        duration_min: dur,
        completed:    false,
      });
      remaining -= dur;
    }
  }

  // Priority 3: Interleaving (if preferred)
  if (remaining > 0 && techniques.includes('interleaving')) {
    const candidate = await getInterleavingCandidate(userId, db);
    if (candidate) {
      const dur = Math.min(15, remaining);
      const desc = { en: 'Interleave — switch to a different subject', sw: 'Badilisha somo tofauti' };
      tasks.push({
        id:           taskId(tasks.length),
        type:         'interleave',
        lesson_id:    candidate,
        description:  { [lang]: resolveI18n(desc, lang) },
        duration_min: dur,
        completed:    false,
      });
      remaining -= dur;
    }
  }

  // Priority 4: New lesson
  if (remaining > 0) {
    const nextLesson = await getNextLesson(userId, db);
    if (nextLesson) {
      const desc = { en: 'Continue your learning journey', sw: 'Endelea na safari yako ya kujifunza' };
      tasks.push({
        id:           taskId(tasks.length),
        type:         'new_lesson',
        lesson_id:    nextLesson,
        description:  { [lang]: resolveI18n(desc, lang) },
        duration_min: remaining,
        completed:    false,
      });
    }
  }

  if (tasks.length > 0) {
    await db.insert(dailyPlans).values({ userId, planDate: today, tasks }).onConflictDoNothing();
  }

  return tasks;
}
