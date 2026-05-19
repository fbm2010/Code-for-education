import Dexie, { Table } from 'dexie';
import type {
  LessonContent, LessonProgress, SRCard, DailyPlan,
  UserPreferences, StudyStreak, SyncRecord,
} from '@zerolink/shared';

interface CachedLesson {
  id: string;
  courseId: string;
  slug: string;
  title: Record<string, string>;
  updatedAt: string;
}

interface CachedContent extends LessonContent {
  cachedAt: number;
  bundlePath?: string;
}

interface SyncOutboxRecord {
  localId?: number;
  table: string;
  recordId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  clientTimestamp: string;
  synced: 0 | 1;
}

interface DownloadedBundle {
  lessonId: string;
  language: string;
  version: number;
  sizeBytes: number;
  cachedAt: number;
  checksum: string;
}

interface Notification {
  id?: number;
  type: string;
  title: string;
  body: string;
  read: 0 | 1;
  createdAt: number;
}

export class ZeroLinkDB extends Dexie {
  lessons!: Table<CachedLesson>;
  lessonContent!: Table<CachedContent>;
  progress!: Table<LessonProgress & { lessonId: string }>;
  srCards!: Table<SRCard>;
  dailyPlan!: Table<DailyPlan & { planDate: string }>;
  syncOutbox!: Table<SyncOutboxRecord>;
  preferences!: Table<{ key: string; value: unknown }>;
  streaks!: Table<StudyStreak & { userId: string }>;
  downloadedBundles!: Table<DownloadedBundle>;
  notifications!: Table<Notification>;

  constructor() {
    super('ZeroLinkDB');
    this.version(1).stores({
      lessons:           '&id, courseId, slug',
      lessonContent:     '&[lessonId+language], lessonId, language, checksum',
      progress:          '&lessonId, status, lastAccessed',
      srCards:           '&id, lessonId, nextReview, [nextReview+lessonId]',
      dailyPlan:         '&planDate',
      syncOutbox:        '++localId, table, synced, clientTimestamp',
      preferences:       '&key',
      streaks:           '&userId',
      downloadedBundles: '&[lessonId+language], lessonId, cachedAt',
      notifications:     '++id, read, createdAt',
    });
  }
}

export const db = new ZeroLinkDB();

export type { SyncOutboxRecord, CachedLesson, CachedContent, DownloadedBundle, Notification };
