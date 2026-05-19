import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: (count, err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404 || status === 401 || status === 403) return false;
        return count < 2;
      },
      networkMode: 'offlineFirst',
    },
  },
});
