import { describe, it, expect } from 'vitest';
import { sm2Update } from '../services/sm2.js';

const baseCard = { ease_factor: 2.5, interval_days: 1, repetitions: 0 };

describe('SM-2 algorithm', () => {
  it('quality < 3 resets repetitions to 0 and interval to 1', () => {
    const r = sm2Update({ ...baseCard, repetitions: 5, interval_days: 30 }, 2);
    expect(r.repetitions).toBe(0);
    expect(r.interval_days).toBe(1);
    expect(r.ease_factor).toBe(2.5);
  });

  it('quality 0 (blackout) resets', () => {
    const r = sm2Update(baseCard, 0);
    expect(r.repetitions).toBe(0);
    expect(r.interval_days).toBe(1);
  });

  it('quality 3 (barely recalled) keeps interval going', () => {
    const r = sm2Update(baseCard, 3);
    expect(r.repetitions).toBe(1);
    expect(r.interval_days).toBe(1);
  });

  it('quality 5 (perfect) increments reps and uses correct interval schedule', () => {
    const step1 = sm2Update(baseCard, 5);
    expect(step1.repetitions).toBe(1);
    expect(step1.interval_days).toBe(1);

    const step2 = sm2Update(step1, 5);
    expect(step2.repetitions).toBe(2);
    expect(step2.interval_days).toBe(6);

    const step3 = sm2Update(step2, 5);
    expect(step3.repetitions).toBe(3);
    expect(step3.interval_days).toBeGreaterThan(6);
  });

  it('ease_factor never goes below 1.3', () => {
    let card = { ...baseCard };
    for (let i = 0; i < 20; i++) {
      card = sm2Update(card, 3);
    }
    expect(card.ease_factor).toBeGreaterThanOrEqual(1.3);
  });

  it('ease_factor increases with quality 5', () => {
    const r = sm2Update(baseCard, 5);
    expect(r.ease_factor).toBeGreaterThan(baseCard.ease_factor);
  });

  it('next_review is in the future for quality >= 3', () => {
    const now = new Date();
    const r   = sm2Update(baseCard, 4);
    expect(r.next_review.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('quality 5 after repetitions > 1 uses interval * ease_factor', () => {
    const card = { ease_factor: 2.5, interval_days: 6, repetitions: 2 };
    const r    = sm2Update(card, 5);
    expect(r.interval_days).toBe(Math.round(6 * r.ease_factor));
  });

  it('all quality values 0-5 produce valid output', () => {
    for (let q = 0; q <= 5; q++) {
      const r = sm2Update(baseCard, q);
      expect(r.ease_factor).toBeGreaterThanOrEqual(1.3);
      expect(r.interval_days).toBeGreaterThanOrEqual(1);
      expect(r.repetitions).toBeGreaterThanOrEqual(0);
      expect(r.next_review).toBeInstanceOf(Date);
    }
  });
});
