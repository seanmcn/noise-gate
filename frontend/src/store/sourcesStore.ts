import { create } from 'zustand';
import type { Source, UserSourceSubscription } from '@noise-gate/shared';
import { dataApi } from '@/lib/data-api';
import { useFeedStore } from './feedStore';

interface SourcesState {
  sources: Source[];
  subscriptions: UserSourceSubscription[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  customSourceLimit: number;

  // Computed getters
  systemSources: () => Source[];
  customSources: () => Source[];
  enabledSourceIds: () => Set<string>;
  customSourceCount: () => number;

  // Actions
  loadSources: () => Promise<void>;
  toggleSourceEnabled: (sourceId: string) => Promise<void>;
  addCustomSource: (url: string, name: string) => Promise<void>;
  removeCustomSource: (subscriptionId: string, sourceId: string) => Promise<void>;
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  sources: [],
  subscriptions: [],
  isLoading: false,
  isSaving: false,
  error: null,
  customSourceLimit: 3,

  // Computed: Get system sources
  systemSources: () => {
    return get().sources.filter(s => s.type === 'system');
  },

  // Computed: Get custom sources the user is subscribed to
  customSources: () => {
    const { sources, subscriptions } = get();
    const subscribedSourceIds = new Set(subscriptions.map(s => s.sourceId));
    return sources.filter(s => s.type === 'custom' && subscribedSourceIds.has(s.id));
  },

  // Computed: Get set of enabled source IDs
  enabledSourceIds: () => {
    return new Set(
      get().subscriptions.filter(s => s.isEnabled).map(s => s.sourceId)
    );
  },

  // Computed: Count of custom sources user is subscribed to
  customSourceCount: () => {
    const { subscriptions } = get();
    return subscriptions.filter(s => s.sourceType === 'custom').length;
  },

  loadSources: async () => {
    set({ isLoading: true, error: null });
    try {
      // Load sources and subscriptions in parallel
      const [sources, subscriptions, prefs] = await Promise.all([
        dataApi.listSources(),
        dataApi.listSubscriptions(),
        dataApi.getPreferences(),
      ]);

      // Check if user needs subscriptions to system sources
      const systemSources = sources.filter(s => s.type === 'system');
      const subscribedSourceIds = new Set(subscriptions.map(s => s.sourceId));
      const missingSystemSources = systemSources.filter(s => !subscribedSourceIds.has(s.id));

      // Auto-subscribe to any missing system sources
      if (missingSystemSources.length > 0) {
        const newSubscriptions: UserSourceSubscription[] = [...subscriptions];

        for (const source of missingSystemSources) {
          try {
            const subscription = await dataApi.createSubscription(source);
            newSubscriptions.push(subscription);
          } catch (err) {
            console.error(`Failed to subscribe to ${source.name}:`, err);
          }
        }

        set({
          sources,
          subscriptions: newSubscriptions,
          customSourceLimit: prefs.customSourceLimit,
          isLoading: false,
        });
      } else {
        set({
          sources,
          subscriptions,
          customSourceLimit: prefs.customSourceLimit,
          isLoading: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load sources',
        isLoading: false,
      });
    }
  },

  toggleSourceEnabled: async (sourceId: string) => {
    const { subscriptions } = get();
    const subscription = subscriptions.find(s => s.sourceId === sourceId);
    if (!subscription) return;

    const newEnabled = !subscription.isEnabled;

    // Optimistic update
    set((state) => ({
      subscriptions: state.subscriptions.map(s =>
        s.sourceId === sourceId ? { ...s, isEnabled: newEnabled } : s
      ),
    }));

    try {
      await dataApi.updateSubscription(subscription.id, newEnabled);
      // Reload articles to reflect subscription change
      useFeedStore.getState().loadArticles();
    } catch (err) {
      // Revert on failure
      set((state) => ({
        subscriptions: state.subscriptions.map(s =>
          s.sourceId === sourceId ? { ...s, isEnabled: !newEnabled } : s
        ),
        error: err instanceof Error ? err.message : 'Failed to toggle source',
      }));
    }
  },

  addCustomSource: async (url: string, name: string) => {
    const { customSourceCount, customSourceLimit } = get();

    // Check limit
    if (customSourceCount() >= customSourceLimit) {
      set({ error: `You can only have ${customSourceLimit} custom sources. Upgrade your plan for more.` });
      return;
    }

    set({ isSaving: true, error: null });
    try {
      const { source, subscription } = await dataApi.addCustomSource(url, name);

      set((state) => {
        // Check if source already exists in state
        const sourceExists = state.sources.some(s => s.id === source.id);

        return {
          sources: sourceExists ? state.sources : [...state.sources, source],
          subscriptions: [...state.subscriptions, subscription],
          isSaving: false,
        };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to add custom source',
        isSaving: false,
      });
    }
  },

  removeCustomSource: async (subscriptionId: string, sourceId: string) => {
    set({ isSaving: true, error: null });
    try {
      await dataApi.removeCustomSource(subscriptionId, sourceId);

      set((state) => ({
        subscriptions: state.subscriptions.filter(s => s.id !== subscriptionId),
        // Keep the source in case others are subscribed
        isSaving: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to remove source',
        isSaving: false,
      });
    }
  },
}));
