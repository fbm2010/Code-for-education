import { create } from 'zustand';
import type { SyncConflict } from '@zerolink/shared';

interface ConflictState {
  conflicts: SyncConflict[];
  addConflicts: (conflicts: SyncConflict[]) => void;
  resolveConflict: (recordId: string) => void;
  dismissAll: () => void;
}

export const useConflictStore = create<ConflictState>((set) => ({
  conflicts: [],
  addConflicts: (incoming) =>
    set((s) => ({ conflicts: [...s.conflicts, ...incoming] })),
  resolveConflict: (recordId) =>
    set((s) => ({ conflicts: s.conflicts.filter((c) => c.recordId !== recordId) })),
  dismissAll: () => set({ conflicts: [] }),
}));
