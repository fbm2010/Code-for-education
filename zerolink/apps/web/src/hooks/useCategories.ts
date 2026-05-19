import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Category } from '@zerolink/shared';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data;
    },
  });
}
