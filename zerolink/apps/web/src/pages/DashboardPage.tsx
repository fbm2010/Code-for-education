import { format } from 'date-fns';
import { BookOpen, Clock, Star, Flame } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useStreak } from '../hooks/useStreak';
import { useDailyPlan } from '../hooks/useDailyPlan';
import { useProgress } from '../hooks/useProgress';
import { useSRCards } from '../hooks/useSRCards';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StreakBadge } from '../components/ui/StreakBadge';
import { LanternLoader } from '../components/ui/LanternLoader';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DailyTask } from '@zerolink/shared';

const TASK_ICONS: Record<string, string> = {
  review_sr: '⏰',
  retrieval_quiz: '🧠',
  new_lesson: '📖',
  interleave: '🔀',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data: streak } = useStreak();
  const { data: plan, isLoading: planLoading } = useDailyPlan();
  const { data: progress } = useProgress();
  const { data: srCards } = useSRCards();
  const qc = useQueryClient();

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/daily-plan/complete/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dailyPlan'] }),
  });

  const completedLessons = progress?.filter(p => p.status === 'completed').length ?? 0;
  const dueCards = srCards?.filter(c => new Date(c.nextReview) <= new Date()).length ?? 0;
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-earth-800">
            {getGreeting()}, {user?.displayName?.split(' ')[0] ?? 'Explorer'} 🌅
          </h1>
          <p className="text-earth-500 text-sm mt-1">{format(today, 'EEEE, MMMM d')}</p>
        </div>
        {streak && <StreakBadge count={streak.currentStreak} />}
      </div>

      {/* Streak tracker */}
      {streak && (
        <section aria-label="Weekly streak" className="card">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-sky-500" aria-hidden="true" />
            <h2 className="font-bold text-earth-800">Study Streak</h2>
            <span className="text-2xl font-black text-earth-400 ml-auto">{streak.currentStreak}</span>
          </div>
          <div className="flex gap-2" role="list" aria-label="Days of the week">
            {DAYS.map((d, i) => {
              const isToday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) === i;
              const isPast = i < (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
              const inStreak = isPast && i >= (dayOfWeek === 0 ? 6 : dayOfWeek - 1) - streak.currentStreak;
              return (
                <div key={d} role="listitem" className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isToday ? 'ring-2 ring-earth-400 bg-earth-100 text-earth-700' :
                      inStreak ? 'bg-sky-400 text-white' :
                      'bg-earth-100 text-earth-400'
                    }`}
                    aria-label={`${d}: ${inStreak ? 'completed' : isToday ? 'today' : 'not completed'}`}
                  >
                    {inStreak ? '✓' : isToday ? '●' : '○'}
                  </div>
                  <span className="text-xs text-earth-400">{d}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick stats */}
      <section aria-label="Quick statistics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lessons Done', value: completedLessons, icon: BookOpen },
            { label: 'SR Cards Due', value: dueCards, icon: Star },
            { label: 'Day Streak', value: streak?.currentStreak ?? 0, icon: Flame },
            { label: 'Longest Streak', value: streak?.longestStreak ?? 0, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card text-center card-hover">
              <Icon className="w-6 h-6 text-earth-400 mx-auto mb-2" aria-hidden="true" />
              <div className="text-3xl font-black text-earth-700">{value}</div>
              <div className="text-earth-500 text-xs font-semibold mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Today's Trail */}
      <section aria-labelledby="trail-title">
        <h2 className="text-xl font-black text-earth-800 mb-4" id="trail-title">📋 Today's Trail</h2>
        {planLoading ? (
          <SkeletonList count={3} />
        ) : !plan?.tasks?.length ? (
          <div className="card text-center py-10">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-bold text-earth-700">Your trail is complete!</p>
            <p className="text-earth-500 text-sm mt-1">Come back tomorrow for a new plan.</p>
          </div>
        ) : (
          <div className="space-y-3" role="list">
            {plan.tasks.map((task: DailyTask) => (
              <div
                key={task.id}
                role="listitem"
                className={`card flex items-center gap-4 transition-opacity ${task.completed ? 'opacity-50' : ''}`}
              >
                <span className="text-2xl" aria-hidden="true">{TASK_ICONS[task.type] ?? '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-earth-800 ${task.completed ? 'line-through' : ''}`}>
                    {task.description['en'] ?? task.description[Object.keys(task.description)[0]]}
                  </p>
                  <p className="text-earth-500 text-sm">{task.durationMin} min</p>
                </div>
                {!task.completed && (
                  <button
                    className="btn-primary text-sm px-4 py-2 shrink-0"
                    onClick={() => completeMutation.mutate(task.id)}
                    disabled={completeMutation.isPending}
                    aria-label={`Complete task: ${task.description['en']}`}
                  >
                    Done ✓
                  </button>
                )}
                {task.completed && (
                  <span className="text-olive-500 text-xl" aria-label="Completed">✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
