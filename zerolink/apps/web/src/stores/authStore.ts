import { create } from 'zustand';
import type { User } from '@zerolink/shared';
import { api } from '../lib/api';

type AuthPayload = {
  user?: Partial<User> & { isGuest?: boolean };
};

function normalizeUser(payload: unknown): User | null {
  const data = payload as AuthPayload | (Partial<User> & { isGuest?: boolean }) | null;
  const raw = (data && 'user' in data ? data.user : data) as (Partial<User> & { isGuest?: boolean }) | null | undefined;
  if (!raw?.id) return null;

  const isGuest = raw.role === 'guest' || raw.isGuest === true;

  return {
    id: raw.id,
    username: raw.username ?? null,
    email: raw.email ?? null,
    displayName: raw.displayName ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    role: raw.role ?? (isGuest ? 'guest' : 'user'),
    emailVerified: raw.emailVerified ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

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
      set({ user: normalizeUser(res.data.data), isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    set({ user: null });
  },
}));
