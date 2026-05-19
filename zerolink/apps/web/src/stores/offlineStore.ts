import { create } from 'zustand';
import type { BandwidthMode } from '../lib/connectivity';

interface OfflineState {
  isOffline: boolean;
  bandwidthMode: BandwidthMode;
  pendingSyncCount: number;
  setOffline: (v: boolean) => void;
  setBandwidthMode: (mode: BandwidthMode) => void;
  setPendingSyncCount: (n: number) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOffline: !navigator.onLine,
  bandwidthMode: 'normal',
  pendingSyncCount: 0,
  setOffline: (v) => set({ isOffline: v }),
  setBandwidthMode: (mode) => set({ bandwidthMode: mode }),
  setPendingSyncCount: (n) => set({ pendingSyncCount: n }),
}));
