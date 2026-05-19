import { Flame } from 'lucide-react';

export function StreakBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 font-bold px-3 py-1 rounded-full text-sm">
      <Flame className="w-4 h-4 text-sky-500" aria-hidden="true" />
      {count} day streak
    </span>
  );
}
