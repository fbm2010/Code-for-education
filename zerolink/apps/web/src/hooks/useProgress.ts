import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { db } from '../lib/db';
import type { LessonProgress } from '@zerolink/shared';

export function useProgress(refetchInterval?: number) {
  return useQuery<LessonProgress[]>({
    queryKey: ['progress'],
    refetchInterval,
    queryFn: async () => {
      const cached = await db.progress.toArray();
      if (!navigator.onLine && cached.length > 0) return cached;

      try {
        const res = await api.get('/progress');
        const progress: LessonProgress[] = res.data.data;
        await db.progress.bulkPut(progress);
        return progress;
      } catch {
        return cached;
      }
    },
  });
}
