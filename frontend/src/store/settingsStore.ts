import { create } from 'zustand';
import type { UserPreferences } from '@noise-gate/shared';
import { dataApi } from '@/lib/data-api';

interface SettingsState {
  preferences: UserPreferences | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadPreferences: () => Promise<void>;
  addBlockedWord: (word: string) => Promise<void>;
  removeBlockedWord: (word: string) => Promise<void>;
  clearBlockedWords: () => Promise<void>;
  setArticlesPerPage: (size: number) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  preferences: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadPreferences: async () => {
    set({ isLoading: true, error: null });
    try {
      const prefs = await dataApi.getPreferences();
      set({ preferences: prefs, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load preferences',
        isLoading: false,
      });
    }
  },

  addBlockedWord: async (word: string) => {
    const { preferences } = get();
    if (!preferences) return;

    const normalizedWord = word.toLowerCase().trim();
    if (preferences.blockedWords.includes(normalizedWord)) return;

    set({ isSaving: true });
    try {
      const updated = await dataApi.putPreferences({
        ...preferences,
        blockedWords: [...preferences.blockedWords, normalizedWord],
      });
      set({ preferences: updated, isSaving: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save',
        isSaving: false,
      });
    }
  },

  removeBlockedWord: async (word: string) => {
    const { preferences } = get();
    if (!preferences) return;

    set({ isSaving: true });
    try {
      const updated = await dataApi.putPreferences({
        ...preferences,
        blockedWords: preferences.blockedWords.filter((w) => w !== word),
      });
      set({ preferences: updated, isSaving: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save',
        isSaving: false,
      });
    }
  },

  clearBlockedWords: async () => {
    const { preferences } = get();
    if (!preferences) return;

    set({ isSaving: true });
    try {
      const updated = await dataApi.putPreferences({
        ...preferences,
        blockedWords: [],
      });
      set({ preferences: updated, isSaving: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save',
        isSaving: false,
      });
    }
  },

  setArticlesPerPage: async (size: number) => {
    const { preferences } = get();
    if (!preferences) return;

    set({ isSaving: true });
    try {
      const updated = await dataApi.putPreferences({
        ...preferences,
        articlesPerPage: size,
      });
      set({ preferences: updated, isSaving: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to save',
        isSaving: false,
      });
    }
  },
}));
