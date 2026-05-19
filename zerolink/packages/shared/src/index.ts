// ── Auth ──────────────────────────────────────────────────────
export type User = {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'guest';
  emailVerified: boolean;
  createdAt: string;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: string;
};

// ── Content ───────────────────────────────────────────────────
export type Category = {
  id: string;
  slug: string;
  name: Record<string, string>;
  description: Record<string, string> | null;
  icon: string | null;
  sortOrder: number;
  lessonCount?: number;
};

export type Course = {
  id: string;
  categoryId: string;
  slug: string;
  title: Record<string, string>;
  description: Record<string, string> | null;
  coverImage: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number | null;
  tags: string[];
  published: boolean;
};

export type Lesson = {
  id: string;
  courseId: string;
  slug: string;
  title: Record<string, string>;
  sortOrder: number;
  estimatedMinutes: number | null;
  contentType: 'text' | 'video' | 'audio' | 'mixed';
  published: boolean;
};

export type LessonContent = {
  lessonId: string;
  language: string;
  version: number;
  bodyHtml?: string;
  bodyText?: string;
  audioUrl?: string | null;
  slidesUrl?: string | null;
  checksum: string;
  sizeBytes: number | null;
  mode: 'full' | 'low_bandwidth';
};

export type QuizQuestion = {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  prompt: Record<string, string>;
  options?: { id: string; text: Record<string, string> }[];
  correct: string;
  explanation: Record<string, string>;
};

export type Quiz = {
  id: string;
  lessonId: string;
  language: string;
  questions: QuizQuestion[];
};

// ── Progress ──────────────────────────────────────────────────
export type LessonProgress = {
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  percentComplete: number;
  lastAccessed: string | null;
  timeSpentSec: number;
  studyTechnique: string | null;
};

export type SRCard = {
  id: string;
  lessonId: string;
  term: { front: string; back: string; language: string };
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: string;
  lastReviewed: string | null;
};

export type StudyStreak = {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
};

export type DailyTask = {
  id: string;
  type: 'review_sr' | 'retrieval_quiz' | 'new_lesson' | 'interleave';
  lessonId: string;
  description: Record<string, string>;
  durationMin: number;
  completed: boolean;
};

export type DailyPlan = {
  planDate: string;
  totalMinutes: number;
  tasks: DailyTask[];
};

// ── Sync ──────────────────────────────────────────────────────
export type SyncRecord = {
  table: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  clientTimestamp: string;
};

export type SyncConflict = {
  recordId: string;
  reason: string;
  serverValue: Record<string, unknown>;
};

// ── Preferences ───────────────────────────────────────────────
export type UserPreferences = {
  primaryLanguage: string;
  lessonLanguages: string[];
  hasReliableInternet: boolean;
  deviceType: 'smartphone' | 'tablet' | 'laptop' | null;
  lowBandwidthDefault: boolean;
  autoDownloadWifi: boolean;
  dailyStudyMinutes: number;
  preferredTechniques: string[];
  notificationsEnabled: boolean;
  timezone: string;
};

// ── Community ─────────────────────────────────────────────────
export type Resource = {
  id: string;
  name: string;
  type: 'library' | 'wifi_spot' | 'device_loan' | 'other';
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  languages: string[];
  subjects: string[];
  verified: boolean;
};

export type TeacherPack = {
  id: string;
  title: string;
  description: string | null;
  languages: string[];
  subjects: string[];
  bundleUrl: string;
  sizeBytes: number | null;
  downloads: number;
  approved: boolean;
  createdAt: string;
};

// ── API Envelopes ─────────────────────────────────────────────
export type ApiResponse<T> = {
  data: T;
  meta: { requestId: string; timestamp: string };
};

export type ApiError = {
  error: { code: string; message: string; field?: string };
};

export type PaginatedResponse<T> = {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  meta: { requestId: string; timestamp: string };
};

// ── SM-2 Algorithm ────────────────────────────────────────────
export type SM2Quality = 0 | 1 | 2 | 3 | 4 | 5;

export type SM2Result = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export function sm2(
  quality: SM2Quality,
  prevEF: number,
  prevInterval: number,
  prevRepetitions: number,
): SM2Result {
  const MIN_EF = 1.3;
  let ef = prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < MIN_EF) ef = MIN_EF;

  let interval: number;
  let repetitions: number;

  if (quality < 3) {
    interval = 1;
    repetitions = 0;
  } else {
    repetitions = prevRepetitions + 1;
    if (prevRepetitions === 0) interval = 1;
    else if (prevRepetitions === 1) interval = 6;
    else interval = Math.round(prevInterval * ef);
  }

  return { easeFactor: ef, intervalDays: interval, repetitions };
}
