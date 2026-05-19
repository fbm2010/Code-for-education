import { create } from 'zustand';
import type { User } from '@zerolink/shared';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.data, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    set({ user: null });
  },
}));
