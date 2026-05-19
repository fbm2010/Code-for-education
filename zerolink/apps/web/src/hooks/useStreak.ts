import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { StudyStreak } from '@zerolink/shared';

export function useStreak() {
  return useQuery<StudyStreak>({
    queryKey: ['streak'],
    queryFn: async () => {
      const res = await api.get('/streaks/me');
      return res.data.data;
    },
  });
}
