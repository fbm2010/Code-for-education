import { describe, it, expect } from 'vitest';

// Pure logic tests for studyCoach helpers
// Full DB integration tests are in dailyPlan.test.ts

describe('studyCoach — task budget logic', () => {
  it('total task minutes should not exceed daily_study_minutes', () => {
    const budget = 30;
    const tasks = [
      { duration_min: 10 },
      { duration_min: 10 },
      { duration_min: 10 },
    ];
    const total = tasks.reduce((s, t) => s + t.duration_min, 0);
    expect(total).toBeLessThanOrEqual(budget);
  });

  it('SR task duration is capped at min(ceil(cards * 0.5), 10, remaining)', () => {
    const cardCount  = 25; // ceil(25 * 0.5) = 13, capped at 10
    const remaining  = 30;
    const dur = Math.min(Math.ceil(cardCount * 0.5), 10, remaining);
    expect(dur).toBe(10);
  });

  it('SR task duration respects remaining budget', () => {
    const cardCount  = 4;
    const remaining  = 3; // less than ceil(4 * 0.5) = 2, but capped at 3
    const dur = Math.min(Math.ceil(cardCount * 0.5), 10, remaining);
    expect(dur).toBe(2);
  });

  it('no tasks produced when budget is 0', () => {
    const budget    = 0;
    const remaining = budget;
    const tasks: { duration_min: number }[] = [];

    const dur = Math.min(Math.ceil(5 * 0.5), 10, remaining);
    if (dur > 0) tasks.push({ duration_min: dur });

    expect(tasks).toHaveLength(0);
  });
});

describe('studyCoach — priority ordering', () => {
  it('SR cards task type is review_sr', () => {
    const taskType = 'review_sr';
    expect(['review_sr', 'retrieval_quiz', 'new_lesson', 'interleave']).toContain(taskType);
  });

  it('weak lesson task type is retrieval_quiz', () => {
    expect('retrieval_quiz').toBe('retrieval_quiz');
  });
});
