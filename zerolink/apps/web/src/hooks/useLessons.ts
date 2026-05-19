import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { db } from '../lib/db';
import { detectBandwidth } from '../lib/connectivity';
import type { Lesson, LessonContent } from '@zerolink/shared';

export function useLesson(id: string) {
  return useQuery<Lesson>({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const res = await api.get(`/lessons/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useLessonContent(id: string, lang: string) {
  return useQuery<LessonContent>({
    queryKey: ['lessonContent', id, lang],
    queryFn: async () => {
      // Try IndexedDB first for instant offline display
      const cached = await db.lessonContent.get([id, lang]);
      if (cached && !navigator.onLine) return cached;

      try {
        const bw = detectBandwidth();
        const res = await api.get(`/lessons/${id}/content`, {
          params: { lang },
          headers: { 'X-ZeroLink-Bandwidth': bw === 'low' ? 'low' : 'normal' },
        });
        const content: LessonContent = res.data.data;
        // Cache in IndexedDB
        await db.lessonContent.put({ ...content, cachedAt: Date.now() });
        return content;
      } catch {
        if (cached) return cached;
        throw new Error('Content unavailable offline');
      }
    },
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}
