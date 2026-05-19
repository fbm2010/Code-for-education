import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { db } from '../lib/db';
import type { SRCard } from '@zerolink/shared';

export function useSRCards() {
  return useQuery<SRCard[]>({
    queryKey: ['srCards'],
    queryFn: async () => {
      const cached = await db.srCards.toArray();
      if (!navigator.onLine && cached.length > 0) return cached;

      try {
        const res = await api.get('/sr-cards');
        const cards: SRCard[] = res.data.data;
        await db.srCards.bulkPut(cards);
        return cards;
      } catch {
        return cached;
      }
    },
  });
}
