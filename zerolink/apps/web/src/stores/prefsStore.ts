import { create } from 'zustand';
import type { UserPreferences } from '@zerolink/shared';
import { db } from '../lib/db';

const DEFAULT_PREFS: UserPreferences = {
  primaryLanguage: 'en',
  lessonLanguages: ['en'],
  hasReliableInternet: false,
  deviceType: null,
  lowBandwidthDefault: false,
  autoDownloadWifi: true,
  dailyStudyMinutes: 30,
  preferredTechniques: ['spaced_repetition'],
  notificationsEnabled: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

interface PrefsState {
  prefs: UserPreferences;
  setPrefs: (prefs: UserPreferences) => void;
  updatePref: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  loadFromDB: () => Promise<void>;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  prefs: DEFAULT_PREFS,

  setPrefs: async (prefs) => {
    set({ prefs });
    await db.preferences.put({ key: 'userPreferences', value: prefs });
  },

  updatePref: async (key, value) => {
    const next = { ...get().prefs, [key]: value };
    set({ prefs: next });
    await db.preferences.put({ key: 'userPreferences', value: next });
  },

  loadFromDB: async () => {
    const stored = await db.preferences.get('userPreferences');
    if (stored) set({ prefs: stored.value as UserPreferences });
  },
}));
