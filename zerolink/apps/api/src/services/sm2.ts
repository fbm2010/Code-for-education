export interface SMCard {
  ease_factor:   number;
  interval_days: number;
  repetitions:   number;
}

export interface SM2Result extends SMCard {
  next_review: Date;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function sm2Update(card: SMCard, quality: number): SM2Result {
  if (quality < 3) {
    return {
      ease_factor:   card.ease_factor,
      interval_days: 1,
      repetitions:   0,
      next_review:   addDays(new Date(), 1),
    };
  }

  const newEF = Math.max(
    1.3,
    card.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );

  let interval: number;
  if (card.repetitions === 0) interval = 1;
  else if (card.repetitions === 1) interval = 6;
  else interval = Math.round(card.interval_days * newEF);

  return {
    ease_factor:   newEF,
    interval_days: interval,
    repetitions:   card.repetitions + 1,
    next_review:   addDays(new Date(), interval),
  };
}
