import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Course } from '@zerolink/shared';

export function useCourse(slug: string) {
  return useQuery<Course>({
    queryKey: ['course', slug],
    queryFn: async () => {
      const res = await api.get(`/courses/${slug}`);
      return res.data.data;
    },
    enabled: !!slug,
  });
}
