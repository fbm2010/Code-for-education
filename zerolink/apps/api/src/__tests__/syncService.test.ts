import { describe, it, expect } from 'vitest';
import { processSyncPush } from '../services/syncService.js';

const TODAY = new Date().toISOString().split('T')[0]!;
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0]!;
})();

// Minimal mock DB
function makeDb(existingProgress?: { id: string; updatedAt: Date } | null) {
  const inserted: Record<string, unknown>[] = [];
  const updated:  Record<string, unknown>[] = [];

  return {
    _inserted: inserted,
    _updated:  updated,
    query: {
      lessonProgress: {
        findFirst: async () => existingProgress ?? null,
      },
      srCards: {
        findFirst: async () => null,
      },
    },
    insert: (_table: unknown) => ({
      values: (vals: Record<string, unknown>) => {
        inserted.push(vals);
        return {
          onConflictDoNothing: () => Promise.resolve(),
          returning: () => Promise.resolve([vals]),
        };
      },
    }),
    update: (_table: unknown) => ({
      set: (vals: Record<string, unknown>) => {
        updated.push(vals);
        return { where: () => Promise.resolve() };
      },
    }),
  };
}

describe('syncService.processSyncPush', () => {
  it('rejects unknown table with a conflict entry', async () => {
    const db = makeDb() as unknown as Parameters<typeof processSyncPush>[3];
    const result = await processSyncPush('user1', 'device1', [{
      table:            'malicious_table',
      record_id:        crypto.randomUUID(),
      operation:        'insert',
      payload:          {},
      client_timestamp: new Date().toISOString(),
    }], db);

    expect(result.accepted).toHaveLength(0);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.record_id).toBeTruthy();
  });

  it('lesson_progress last-write-wins — server is newer so returns conflict', async () => {
    const serverTs = new Date();
    const clientTs = new Date(serverTs.getTime() - 60_000); // client is 1 min older

    const db = makeDb({ id: 'prog1', updatedAt: serverTs }) as unknown as Parameters<typeof processSyncPush>[3];
    const result = await processSyncPush('user1', 'device1', [{
      table:            'lesson_progress',
      record_id:        'prog1',
      operation:        'update',
      payload:          { status: 'completed' },
      client_timestamp: clientTs.toISOString(),
    }], db);

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.resolution).toBe('server_wins');
  });

  it('lesson_progress last-write-wins — client is newer so accepted', async () => {
    const clientTs = new Date();
    const serverTs = new Date(clientTs.getTime() - 60_000);

    const db = makeDb({ id: 'prog2', updatedAt: serverTs }) as unknown as Parameters<typeof processSyncPush>[3];
    const result = await processSyncPush('user1', 'device1', [{
      table:            'lesson_progress',
      record_id:        'prog2',
      operation:        'update',
      payload:          { lesson_id: 'lesson1', status: 'completed', percent_complete: 100 },
      client_timestamp: clientTs.toISOString(),
    }], db);

    expect(result.accepted).toContain('prog2');
    expect(result.conflicts).toHaveLength(0);
  });

  it('quiz_attempts are always inserted (append-only)', async () => {
    const db = makeDb() as unknown as Parameters<typeof processSyncPush>[3];
    const result = await processSyncPush('user1', 'device1', [{
      table:            'quiz_attempts',
      record_id:        crypto.randomUUID(),
      operation:        'insert',
      payload:          { quiz_id: crypto.randomUUID(), answers: {}, score: 0.8 },
      client_timestamp: new Date().toISOString(),
    }], db);

    expect(result.accepted).toHaveLength(1);
    expect(result.conflicts).toHaveLength(0);
  });

  it('daily_plans always server wins', async () => {
    const db = makeDb() as unknown as Parameters<typeof processSyncPush>[3];
    const result = await processSyncPush('user1', 'device1', [{
      table:            'daily_plans',
      record_id:        crypto.randomUUID(),
      operation:        'insert',
      payload:          { tasks: [] },
      client_timestamp: new Date().toISOString(),
    }], db);

    expect(result.conflicts[0]?.resolution).toBe('server_wins');
  });
});
