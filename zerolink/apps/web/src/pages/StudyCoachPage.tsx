import { useState } from 'react';
import { BookOpen, Zap, Flame, Shuffle } from 'lucide-react';
import { useDailyPlan } from '../hooks/useDailyPlan';
import { useSRCards } from '../hooks/useSRCards';
import { useStreak } from '../hooks/useStreak';
import { FlashCard } from '../components/ui/FlashCard';
import { StreakBadge } from '../components/ui/StreakBadge';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { db } from '../lib/db';
import { sm2 } from '@zerolink/shared';
import type { SRCard, DailyTask } from '@zerolink/shared';

const TECHNIQUES = [
  {
    key: 'spaced_repetition', icon: BookOpen, name: 'Spaced Repetition',
    desc: 'Like returning to a campfire at just the right time — each review at a longer interval strengthens memory permanently.',
    tip: 'Review after 1 day, then 3, then 7, then 14.',
  },
  {
    key: 'retrieval_practice', icon: Zap, name: 'Retrieval Practice',
    desc: 'Close your notes and test yourself. The struggle to recall IS the learning.',
    tip: 'After reading, close the lesson and write down everything you remember.',
  },
  {
    key: 'daily_streak', icon: Flame, name: 'Daily Streak',
    desc: 'Consistency beats marathon sessions. 15 minutes every day builds a mighty trail.',
    tip: 'Keep the streak — even 5 minutes counts on hard days.',
  },
  {
    key: 'interleaving', icon: Shuffle, name: 'Interleaving',
    desc: 'Mix subjects in one session. Switching makes your brain work harder — and remember more.',
    tip: 'Math → Science → Language → back to Math.',
  },
];

const TASK_ICONS: Record<string, string> = {
  review_sr: '⏰', retrieval_quiz: '🧠', new_lesson: '📖', interleave: '🔀',
};

export function StudyCoachPage() {
  const { data: plan, isLoading: planLoading } = useDailyPlan();
  const { data: srCards, isLoading: cardsLoading } = useSRCards();
  const { data: streak } = useStreak();
  const qc = useQueryClient();
  const [reviewMode, setReviewMode] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);

  const due = srCards?.filter(c => new Date(c.nextReview) <= new Date()) ?? [];
  const current: SRCard | undefined = due[cardIndex];

  const rateMutation = useMutation({
    mutationFn: async ({ card, quality }: { card: SRCard; quality: 0 | 1 | 2 | 3 | 4 | 5 }) => {
      const result = sm2(quality, card.easeFactor, card.intervalDays, card.repetitions);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + result.intervalDays);
      const updated = { ...card, ...result, nextReview: nextReview.toISOString(), lastReviewed: new Date().toISOString() };
      await db.srCards.put(updated);
      return api.patch(`/sr-cards/${card.id}/review`, { quality });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['srCards'] });
      if (cardIndex + 1 >= due.length) {
        setReviewDone(true);
      } else {
        setCardIndex(i => i + 1);
      }
    },
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/daily-plan/complete/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dailyPlan'] }),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-earth-800">📖 Study Coach</h1>
          <p className="text-earth-500 mt-1">Your guidebook & trail plan</p>
        </div>
        {streak && <StreakBadge count={streak.currentStreak} />}
      </div>

      {/* SR Card Review */}
      <section aria-labelledby="sr-title">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-earth-800" id="sr-title">
            ⏰ Flashcard Review
            {due.length > 0 && (
              <span className="ml-2 text-sm bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full">
                {due.length} due
              </span>
            )}
          </h2>
          {!reviewMode && due.length > 0 && (
            <button className="btn-primary text-sm" onClick={() => { setReviewMode(true); setCardIndex(0); setReviewDone(false); }}>
              Start Review
            </button>
          )}
        </div>

        {cardsLoading ? (
          <div className="card py-8 text-center text-earth-400">Loading cards…</div>
        ) : !reviewMode ? (
          <div className="card text-center py-8">
            {due.length === 0 ? (
              <>
                <div className="text-4xl mb-3">✨</div>
                <p className="font-bold text-earth-700">All caught up!</p>
                <p className="text-earth-500 text-sm mt-1">No cards due for review today.</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">📚</div>
                <p className="font-bold text-earth-700">{due.length} cards ready for review</p>
                <p className="text-earth-500 text-sm mt-1">These are due for spaced repetition.</p>
              </>
            )}
          </div>
        ) : reviewDone ? (
          <div className="card text-center py-8">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-black text-earth-700 text-xl">All done!</p>
            <p className="text-earth-500 mt-1">Excellent work on the review session.</p>
            <button className="btn-secondary mt-4" onClick={() => setReviewMode(false)}>Close</button>
          </div>
        ) : current ? (
          <FlashCard
            front={current.term.front}
            back={current.term.back}
            onRate={q => rateMutation.mutate({ card: current, quality: q })}
          />
        ) : null}
      </section>

      {/* Today's Trail */}
      <section aria-labelledby="trail-coach-title">
        <h2 className="text-xl font-black text-earth-800 mb-4" id="trail-coach-title">📋 Today's Trail</h2>
        {planLoading ? (
          <SkeletonList count={3} />
        ) : (
          <div className="space-y-3" role="list">
            {plan?.tasks?.map((task: DailyTask) => (
              <div
                key={task.id}
                role="listitem"
                className={`card flex items-center gap-4 ${task.completed ? 'opacity-60' : ''}`}
              >
                <span className="text-2xl" aria-hidden="true">{TASK_ICONS[task.type] ?? '📌'}</span>
                <div className="flex-1">
                  <p className={`font-semibold text-earth-800 ${task.completed ? 'line-through' : ''}`}>
                    {task.description['en'] ?? task.description[Object.keys(task.description)[0]]}
                  </p>
                  <p className="text-earth-500 text-sm">{task.durationMin} min</p>
                </div>
                {!task.completed && (
                  <button
                    className="btn-primary text-sm px-3 py-1.5"
                    onClick={() => completeMutation.mutate(task.id)}
                  >
                    Done ✓
                  </button>
                )}
                {task.completed && <span className="text-olive-500 text-xl">✓</span>}
              </div>
            )) ?? (
              <div className="card text-center py-8 text-earth-400">No plan generated yet.</div>
            )}
          </div>
        )}
      </section>

      {/* Technique cards */}
      <section aria-labelledby="techniques-title">
        <h2 className="text-xl font-black text-earth-800 mb-4" id="techniques-title">📚 Study Techniques</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TECHNIQUES.map(({ key, icon: Icon, name, desc, tip }) => (
            <div key={key} className="card card-hover">
              <Icon className="w-8 h-8 text-earth-400 mb-3" aria-hidden="true" />
              <h3 className="font-black text-earth-800 mb-2">{name}</h3>
              <p className="text-earth-600 text-sm mb-3">{desc}</p>
              <p className="text-earth-400 text-xs italic">"{tip}"</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
