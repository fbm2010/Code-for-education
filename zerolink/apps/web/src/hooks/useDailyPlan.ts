import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { db } from '../lib/db';
import type { DailyPlan } from '@zerolink/shared';
import { format } from 'date-fns';

export function useDailyPlan() {
  return useQuery<DailyPlan>({
    queryKey: ['dailyPlan'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const cached = await db.dailyPlan.get(today);
      if (cached && !navigator.onLine) return cached;

      try {
        const res = await api.get('/daily-plan');
        const plan: DailyPlan = res.data.data;
        await db.dailyPlan.put(plan);
        return plan;
      } catch {
        if (cached) return cached;
        throw new Error('Daily plan unavailable');
      }
    },
  });
}
