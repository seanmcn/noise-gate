import { create } from 'zustand';
import type { Feed } from '@noise-gate/shared';
import { dataApi } from '@/lib/data-api';

interface FeedsState {
  feeds: Feed[];
  isLoading: boolean;
  isSeeding: boolean;
  isSaving: boolean;
  error: string | null;

  loadFeeds: () => Promise<void>;
  addFeed: (feed: { url: string; name: string }) => Promise<void>;
  updateFeed: (id: string, updates: Partial<Feed>) => Promise<void>;
  deleteFeed: (id: string) => Promise<void>;
  toggleFeed: (id: string) => Promise<void>;
  togglePriority: (id: string) => Promise<void>;
}

export const useFeedsStore = create<FeedsState>((set, get) => ({
  feeds: [],
  isLoading: false,
  isSeeding: false,
  isSaving: false,
  error: null,

  loadFeeds: async () => {
    set({ isLoading: true, error: null });
    try {
      let feeds = await dataApi.listFeeds();

      // If no feeds exist and not already seeding, seed defaults
      if (feeds.length === 0 && !get().isSeeding) {
        set({ isSeeding: true });
        feeds = await dataApi.seedDefaultFeeds();
        set({ isSeeding: false });
      }

      set({ feeds, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load feeds',
        isLoading: false,
        isSeeding: false,
      });
    }
  },

  addFeed: async (feed) => {
    set({ isSaving: true, error: null });
    try {
      const newFeed = await dataApi.createFeed({
        ...feed,
        isActive: true,
        isPriority: false,
        pollIntervalMinutes: 15,
        consecutiveErrors: 0,
      });
      set((state) => ({
        feeds: [...state.feeds, newFeed],
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to add feed',
        isSaving: false,
      });
    }
  },

  updateFeed: async (id, updates) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await dataApi.updateFeed(id, updates);
      set((state) => ({
        feeds: state.feeds.map((f) => (f.id === id ? updated : f)),
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update feed',
        isSaving: false,
      });
    }
  },

  deleteFeed: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await dataApi.deleteFeed(id);
      set((state) => ({
        feeds: state.feeds.filter((f) => f.id !== id),
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete feed',
        isSaving: false,
      });
    }
  },

  toggleFeed: async (id) => {
    const { feeds } = get();
    const feed = feeds.find((f) => f.id === id);
    if (!feed) return;

    // Optimistic update
    set((state) => ({
      feeds: state.feeds.map((f) =>
        f.id === id ? { ...f, isActive: !f.isActive } : f
      ),
    }));

    try {
      await dataApi.updateFeed(id, { isActive: !feed.isActive });
    } catch (err) {
      // Revert on failure
      set((state) => ({
        feeds: state.feeds.map((f) =>
          f.id === id ? { ...f, isActive: feed.isActive } : f
        ),
        error: err instanceof Error ? err.message : 'Failed to toggle feed',
      }));
    }
  },

  togglePriority: async (id) => {
    const { feeds } = get();
    const feed = feeds.find((f) => f.id === id);
    if (!feed) return;

    // Optimistic update
    set((state) => ({
      feeds: state.feeds.map((f) =>
        f.id === id ? { ...f, isPriority: !f.isPriority } : f
      ),
    }));

    try {
      await dataApi.updateFeed(id, { isPriority: !feed.isPriority });
    } catch (err) {
      // Revert on failure
      set((state) => ({
        feeds: state.feeds.map((f) =>
          f.id === id ? { ...f, isPriority: feed.isPriority } : f
        ),
        error: err instanceof Error ? err.message : 'Failed to toggle priority',
      }));
    }
  },
}));
