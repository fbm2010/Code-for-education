import {
  pgTable, uuid, text, timestamp, boolean, integer,
  jsonb, doublePrecision, date, index, primaryKey,
  uniqueIndex, check, smallint,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ── Auth ──────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  username:     text('username').unique(),
  email:        text('email').unique(),
  passwordHash: text('password_hash'),
  displayName:  text('display_name'),
  avatarUrl:    text('avatar_url'),
  role:         text('role').default('user').notNull(),
  isGuest:      boolean('is_guest').default(false).notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt:    timestamp('deleted_at', { withTimezone: true }),
}, t => ({
  emailIdx:    index('users_email_idx').on(t.email),
  usernameIdx: index('users_username_idx').on(t.username),
}));

// Lucia v3 requires: id TEXT, user_id (ref users.id), expires_at TIMESTAMP
export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
}, t => ({
  userIdx: index('sessions_user_id_idx').on(t.userId),
}));

export const oauthAccounts = pgTable('oauth_accounts', {
  provider:   text('provider').notNull(),
  providerId: text('provider_id').notNull(),
  userId:     uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, t => ({
  pk: primaryKey({ columns: [t.provider, t.providerId] }),
}));

export const userPreferences = pgTable('user_preferences', {
  userId:               uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  primaryLanguage:      text('primary_language').default('en').notNull(),
  lessonLanguages:      text('lesson_languages').array().default(sql`ARRAY['en']::text[]`).notNull(),
  hasReliableInternet:  boolean('has_reliable_internet').default(false).notNull(),
  deviceType:           text('device_type'), // 'smartphone' | 'tablet' | 'laptop'
  lowBandwidthDefault:  boolean('low_bandwidth_default').default(false).notNull(),
  autoDownloadWifi:     boolean('auto_download_wifi').default(true).notNull(),
  dailyStudyMinutes:    integer('daily_study_minutes').default(30).notNull(),
  preferredTechniques:  text('preferred_techniques').array().default(sql`ARRAY['spaced_repetition']::text[]`).notNull(),
  notificationsEnabled: boolean('notifications_enabled').default(true).notNull(),
  timezone:             text('timezone').default('UTC').notNull(),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Content ───────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        text('slug').unique().notNull(),
  name:        jsonb('name').notNull().$type<Record<string, string>>(),
  description: jsonb('description').$type<Record<string, string>>(),
  icon:        text('icon'),
  colorGradient: text('color_gradient'),
  sortOrder:   integer('sort_order').default(0).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  slugIdx: uniqueIndex('categories_slug_idx').on(t.slug),
}));

export const courses = pgTable('courses', {
  id:               uuid('id').primaryKey().defaultRandom(),
  categoryId:       uuid('category_id').notNull().references(() => categories.id),
  slug:             text('slug').unique().notNull(),
  title:            jsonb('title').notNull().$type<Record<string, string>>(),
  description:      jsonb('description').$type<Record<string, string>>(),
  coverImage:       text('cover_image'),
  difficulty:       text('difficulty').$type<'beginner' | 'intermediate' | 'advanced'>(),
  estimatedMinutes: integer('estimated_minutes'),
  tags:             text('tags').array().default(sql`ARRAY[]::text[]`).notNull(),
  published:        boolean('published').default(false).notNull(),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  slugIdx:     uniqueIndex('courses_slug_idx').on(t.slug),
  categoryIdx: index('courses_category_id_idx').on(t.categoryId),
  publishedIdx: index('courses_published_idx').on(t.published),
}));

export const lessons = pgTable('lessons', {
  id:               uuid('id').primaryKey().defaultRandom(),
  courseId:         uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  slug:             text('slug').notNull(),
  title:            jsonb('title').notNull().$type<Record<string, string>>(),
  sortOrder:        integer('sort_order').default(0).notNull(),
  estimatedMinutes: integer('estimated_minutes'),
  contentType:      text('content_type').$type<'text' | 'video' | 'audio' | 'mixed'>(),
  published:        boolean('published').default(false).notNull(),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  courseSlugUnique: uniqueIndex('lessons_course_slug_idx').on(t.courseId, t.slug),
  courseIdx:        index('lessons_course_id_idx').on(t.courseId),
  sortIdx:          index('lessons_sort_order_idx').on(t.courseId, t.sortOrder),
}));

export const lessonContent = pgTable('lesson_content', {
  id:         uuid('id').primaryKey().defaultRandom(),
  lessonId:   uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  language:   text('language').notNull(),
  version:    integer('version').default(1).notNull(),
  bodyHtml:   text('body_html'),
  bodyText:   text('body_text'),
  audioUrl:   text('audio_url'),
  slidesUrl:  text('slides_url'),
  checksum:   text('checksum'),
  sizeBytes:  integer('size_bytes'),
  published:  boolean('published').default(false).notNull(),
  createdAt:  timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  lessonLangIdx:        index('lesson_content_lesson_lang_idx').on(t.lessonId, t.language),
  latestVersionUnique:  uniqueIndex('lesson_content_latest_idx').on(t.lessonId, t.language, t.version),
}));

export const mediaAssets = pgTable('media_assets', {
  id:            uuid('id').primaryKey().defaultRandom(),
  lessonId:      uuid('lesson_id').references(() => lessons.id),
  filename:      text('filename').notNull(),
  mimeType:      text('mime_type').notNull(),
  sizeBytes:     integer('size_bytes'),
  storageKey:    text('storage_key').notNull(),
  compressedKey: text('compressed_key'),
  width:         integer('width'),
  height:        integer('height'),
  durationSec:   doublePrecision('duration_sec'),
  processed:     boolean('processed').default(false).notNull(),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  lessonIdx: index('media_assets_lesson_id_idx').on(t.lessonId),
}));

export const quizzes = pgTable('quizzes', {
  id:        uuid('id').primaryKey().defaultRandom(),
  lessonId:  uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  language:  text('language').notNull(),
  questions: jsonb('questions').notNull().$type<QuizQuestionsPayload>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  lessonLangIdx: index('quizzes_lesson_lang_idx').on(t.lessonId, t.language),
}));

export type QuizQuestionsPayload = Array<{
  id:           string;
  type:         'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  prompt:       Record<string, string>;
  options?:     Array<{ id: string; text: Record<string, string> }>;
  correct:      string;
  explanation?: Record<string, string>;
}>;

export const teacherPacks = pgTable('teacher_packs', {
  id:          uuid('id').primaryKey().defaultRandom(),
  authorId:    uuid('author_id').references(() => users.id),
  title:       text('title').notNull(),
  description: text('description'),
  languages:   text('languages').array().default(sql`ARRAY[]::text[]`).notNull(),
  subjects:    text('subjects').array().default(sql`ARRAY[]::text[]`).notNull(),
  bundleUrl:   text('bundle_url').notNull(),
  sizeBytes:   integer('size_bytes'),
  downloads:   integer('downloads').default(0).notNull(),
  approved:    boolean('approved').default(false).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  approvedIdx: index('teacher_packs_approved_idx').on(t.approved),
}));

// ── Progress & Study ──────────────────────────────────────────

export const enrollments = pgTable('enrollments', {
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId:    uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  enrolledAt:  timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, t => ({
  pk:       primaryKey({ columns: [t.userId, t.courseId] }),
  userIdx:  index('enrollments_user_id_idx').on(t.userId),
}));

export const lessonProgress = pgTable('lesson_progress', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId:        uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  status:          text('status').$type<'not_started' | 'in_progress' | 'completed'>().default('not_started').notNull(),
  percentComplete: integer('percent_complete').default(0).notNull(),
  lastAccessed:    timestamp('last_accessed', { withTimezone: true }),
  timeSpentSec:    integer('time_spent_sec').default(0).notNull(),
  studyTechnique:  text('study_technique'),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userLessonUnique: uniqueIndex('lesson_progress_user_lesson_idx').on(t.userId, t.lessonId),
  statusIdx:        index('lesson_progress_status_idx').on(t.userId, t.status),
}));

export const quizAttempts = pgTable('quiz_attempts', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizId:      uuid('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  lessonId:    uuid('lesson_id').references(() => lessons.id),
  answers:     jsonb('answers').$type<Record<string, string>>().notNull(),
  score:       doublePrecision('score').notNull(),
  durationSec: integer('duration_sec'),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx:   index('quiz_attempts_user_id_idx').on(t.userId),
  lessonIdx: index('quiz_attempts_lesson_id_idx').on(t.lessonId),
}));

export const srCards = pgTable('sr_cards', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId:     uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  term:         jsonb('term').notNull().$type<{ front: string; back: string; language: string }>(),
  easeFactor:   doublePrecision('ease_factor').default(2.5).notNull(),
  intervalDays: integer('interval_days').default(1).notNull(),
  repetitions:  integer('repetitions').default(0).notNull(),
  nextReview:   date('next_review').notNull(),
  lastReviewed: timestamp('last_reviewed', { withTimezone: true }),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userDueIdx:  index('sr_cards_user_due_idx').on(t.userId, t.nextReview),
  lessonIdx:   index('sr_cards_lesson_id_idx').on(t.lessonId),
}));

export const studyStreaks = pgTable('study_streaks', {
  userId:            uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  currentStreak:     integer('current_streak').default(0).notNull(),
  longestStreak:     integer('longest_streak').default(0).notNull(),
  lastStudyDate:     date('last_study_date'),
  streakFrozenUntil: date('streak_frozen_until'),
});

export const studyEvents = pgTable('study_events', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  payload:   jsonb('payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userIdx:    index('study_events_user_id_idx').on(t.userId),
  typeIdx:    index('study_events_type_idx').on(t.userId, t.eventType),
  recentIdx:  index('study_events_recent_idx').on(t.userId, t.createdAt),
}));

export const dailyPlans = pgTable('daily_plans', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planDate:    date('plan_date').notNull(),
  tasks:       jsonb('tasks').notNull().$type<DailyPlanTask[]>(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userDateUnique: uniqueIndex('daily_plans_user_date_idx').on(t.userId, t.planDate),
}));

export type DailyPlanTask = {
  id:           string;
  type:         'review_sr' | 'retrieval_quiz' | 'new_lesson' | 'interleave';
  lesson_id:    string;
  description:  Record<string, string>;
  duration_min: number;
  completed:    boolean;
};

// ── Sync & Offline ─────────────────────────────────────────────

export const syncRecords = pgTable('sync_records', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId:  text('device_id').notNull(),
  tableName: text('table_name').notNull(),
  recordId:  uuid('record_id').notNull(),
  operation: text('operation').$type<'insert' | 'update' | 'delete'>().notNull(),
  payload:   jsonb('payload').$type<Record<string, unknown>>(),
  syncedAt:  timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  userDeviceIdx: index('sync_records_user_device_idx').on(t.userId, t.deviceId),
  syncedAtIdx:   index('sync_records_synced_at_idx').on(t.syncedAt),
}));

export const downloadManifests = pgTable('download_manifests', {
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId:     text('device_id').notNull(),
  lessonId:     uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  language:     text('language').notNull(),
  version:      integer('version').notNull(),
  downloadedAt: timestamp('downloaded_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  pk: primaryKey({ columns: [t.userId, t.deviceId, t.lessonId, t.language] }),
}));

export const resources = pgTable('resources', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),
  type:        text('type').$type<'library' | 'wifi_spot' | 'device_loan' | 'other'>().notNull(),
  description: text('description'),
  address:     text('address'),
  lat:         doublePrecision('lat'),
  lng:         doublePrecision('lng'),
  languages:   text('languages').array().default(sql`ARRAY[]::text[]`).notNull(),
  subjects:    text('subjects').array().default(sql`ARRAY[]::text[]`).notNull(),
  verified:    boolean('verified').default(false).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => ({
  typeIdx:     index('resources_type_idx').on(t.type),
  verifiedIdx: index('resources_verified_idx').on(t.verified),
}));

export const dailySummaries = pgTable('daily_summaries', {
  userId:           uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:             date('date').notNull(),
  eventsCount:      integer('events_count').default(0).notNull(),
  minutesStudied:   integer('minutes_studied').default(0).notNull(),
  lessonsCompleted: integer('lessons_completed').default(0).notNull(),
  srReviews:        integer('sr_reviews').default(0).notNull(),
}, t => ({
  pk:      primaryKey({ columns: [t.userId, t.date] }),
  dateIdx: index('daily_summaries_date_idx').on(t.date),
}));

// ── Relations ─────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences:      one(userPreferences, { fields: [users.id], references: [userPreferences.userId] }),
  sessions:         many(sessions),
  oauthAccounts:    many(oauthAccounts),
  enrollments:      many(enrollments),
  lessonProgress:   many(lessonProgress),
  srCards:          many(srCards),
  studyStreak:      one(studyStreaks, { fields: [users.id], references: [studyStreaks.userId] }),
  studyEvents:      many(studyEvents),
  dailyPlans:       many(dailyPlans),
  quizAttempts:     many(quizAttempts),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category:    one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  lessons:     many(lessons),
  enrollments: many(enrollments),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course:        one(courses, { fields: [lessons.courseId], references: [courses.id] }),
  content:       many(lessonContent),
  media:         many(mediaAssets),
  quizzes:       many(quizzes),
  srCards:       many(srCards),
  progress:      many(lessonProgress),
}));
