import type { FastifyRequest } from 'fastify';
import type { User, Session } from 'lucia';

// ── Auth ──────────────────────────────────────────────────────
export interface AuthenticatedRequest extends FastifyRequest {
  user:    User;
  session: Session;
}

// ── Multilingual ──────────────────────────────────────────────
export type I18nMap = Record<string, string>;

export type SupportedLanguage =
  | 'en' | 'sw' | 'fr' | 'ar' | 'hi' | 'pt' | 'am' | 'ha';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'en', 'sw', 'fr', 'ar', 'hi', 'pt', 'am', 'ha',
];

// ── Content ───────────────────────────────────────────────────
export type ContentType = 'text' | 'video' | 'audio' | 'mixed';
export type Difficulty  = 'beginner' | 'intermediate' | 'advanced';
export type LessonStatus = 'not_started' | 'in_progress' | 'completed';

export interface QuizQuestion {
  id:       string;
  type:     'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  prompt:   I18nMap;
  options?: Array<{ id: string; text: I18nMap }>;
  correct:  string;
  explanation?: I18nMap;
}

export interface QuizPayload {
  questions: QuizQuestion[];
}

// ── Daily Plan ────────────────────────────────────────────────
export type TaskType =
  | 'review_sr'
  | 'retrieval_quiz'
  | 'new_lesson'
  | 'interleave';

export interface PlanTask {
  id:           string;
  type:         TaskType;
  lesson_id:    string;
  description:  I18nMap;
  duration_min: number;
  completed:    boolean;
}

// ── Study Techniques ──────────────────────────────────────────
export type StudyTechnique =
  | 'spaced_repetition'
  | 'retrieval_practice'
  | 'interleaving'
  | 'streak';

// ── SM-2 ─────────────────────────────────────────────────────
export interface SM2Card {
  ease_factor:   number;
  interval_days: number;
  repetitions:   number;
}

export interface SM2Result extends SM2Card {
  next_review: Date;
}

// ── Sync ─────────────────────────────────────────────────────
export type SyncOperation = 'insert' | 'update' | 'delete';

export interface SyncRecord {
  localId?:          number;
  table:             string;
  record_id:         string;
  operation:         SyncOperation;
  payload?:          Record<string, unknown>;
  client_timestamp:  string;
  synced?:           0 | 1;
}

export interface SyncPushResult {
  accepted:  string[];
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  record_id:   string;
  table:       string;
  server_value: unknown;
  client_value: unknown;
  resolution:  'server_wins' | 'client_wins' | 'manual';
}

export interface SyncPullResult {
  changes:          SyncRecord[];
  server_timestamp: string;
}

// ── Bandwidth ─────────────────────────────────────────────────
export type BandwidthMode = 'low' | 'normal';

declare module 'fastify' {
  interface FastifyRequest {
    isLowBandwidth: boolean;
    bandwidthMode:  BandwidthMode;
    userId?:        string;
  }
}

// ── Pagination ────────────────────────────────────────────────
export interface PaginatedResult<T> {
  data:        T[];
  next_cursor: string | null;
  has_more:    boolean;
  total?:      number;
}

// ── API Response wrapper ──────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
}

// ── Offline Bundle ────────────────────────────────────────────
export interface BundleManifest {
  id:          string;
  lesson_id:   string;
  language:    string;
  version:     number;
  title:       string;
  checksum:    string;
  size_bytes:  number;
  assets:      string[];
  created_at:  string;
}
