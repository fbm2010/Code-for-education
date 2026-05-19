import { describe, it, expect } from 'vitest';
import { recordStudySession } from '../services/streakService.js';
import type { DB } from '../db/index.js';

// Minimal in-memory mock DB — avoids requiring a real Postgres connection
function makeDb(existing: { lastStudyDate?: string | null; currentStreak?: number; longestStreak?: number } | null) {
  const insertedValues: Record<string, unknown>[] = [];
  const updatedValues:  Record<string, unknown>[] = [];

  return {
    _inserted: insertedValues,
    _updated:  updatedValues,
    query: {
      studyStreaks: {
        findFirst: async () => existing ? {
          userId:            'user1',
          lastStudyDate:     existing.lastStudyDate ?? null,
          currentStreak:     existing.currentStreak ?? 0,
          longestStreak:     existing.longestStreak ?? 0,
          streakFrozenUntil: null,
        } : null,
      },
    },
    insert: (_table: unknown) => ({
      values: (vals: Record<string, unknown>) => {
        insertedValues.push(vals);
        return { onConflictDoNothing: () => Promise.resolve() };
      },
    }),
    update: (_table: unknown) => ({
      set: (vals: Record<string, unknown>) => {
        updatedValues.push(vals);
        return { where: () => Promise.resolve() };
      },
    }),
  };
}

type MockDb = ReturnType<typeof makeDb>;

function asDb(m: MockDb): DB { return m as unknown as DB; }

const TODAY = new Date().toISOString().split('T')[0]!;
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0]!;
})();
const TWO_DAYS_AGO = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  return d.toISOString().split('T')[0]!;
})();

describe('streakService.recordStudySession', () => {
  it('creates a new streak record for first-time user', async () => {
    const mock = makeDb(null);
    await recordStudySession('user1', asDb(mock));
    expect(mock._inserted).toHaveLength(1);
    expect(mock._inserted[0]).toMatchObject({ currentStreak: 1, longestStreak: 1 });
  });

  it('does not double-count the same day', async () => {
    const mock = makeDb({ lastStudyDate: TODAY, currentStreak: 3, longestStreak: 5 });
    await recordStudySession('user1', asDb(mock));
    expect(mock._updated).toHaveLength(0);
  });

  it('increments streak for consecutive days', async () => {
    const mock = makeDb({ lastStudyDate: YESTERDAY, currentStreak: 4, longestStreak: 10 });
    await recordStudySession('user1', asDb(mock));
    expect(mock._updated[0]).toMatchObject({ currentStreak: 5, longestStreak: 10 });
  });

  it('resets streak to 1 after a gap', async () => {
    const mock = makeDb({ lastStudyDate: TWO_DAYS_AGO, currentStreak: 7, longestStreak: 12 });
    await recordStudySession('user1', asDb(mock));
    expect(mock._updated[0]).toMatchObject({ currentStreak: 1, longestStreak: 12 });
  });

  it('updates longestStreak when current exceeds it', async () => {
    const mock = makeDb({ lastStudyDate: YESTERDAY, currentStreak: 15, longestStreak: 15 });
    await recordStudySession('user1', asDb(mock));
    expect(mock._updated[0]).toMatchObject({ currentStreak: 16, longestStreak: 16 });
  });

  it('handles null lastStudyDate as a broken streak', async () => {
    const mock = makeDb({ lastStudyDate: null, currentStreak: 0, longestStreak: 5 });
    await recordStudySession('user1', asDb(mock));
    expect(mock._updated[0]).toMatchObject({ currentStreak: 1 });
  });
});
