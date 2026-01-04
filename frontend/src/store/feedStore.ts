import { create } from 'zustand';
import type { Article, Sentiment, Category } from '@noise-gate/shared';
import { dataApi } from '@/lib/data-api';

interface FeedState {
  // Data
  articles: Article[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Filter state (ephemeral, not persisted)
  sentimentFilters: Sentiment[];
  categoryFilters: Category[];
  showHidden: boolean;

  // Pagination
  currentPage: number;

  // Actions
  loadArticles: () => Promise<void>;
  markAsSeen: (id: string) => Promise<void>;

  // Filter actions
  toggleSentiment: (sentiment: Sentiment) => void;
  toggleCategory: (category: Category) => void;
  toggleShowHidden: () => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  articles: [],
  isLoading: false,
  error: null,
  sentimentFilters: [],
  categoryFilters: [],
  showHidden: false,
  currentPage: 1,

  loadArticles: async () => {
    set({ isLoading: true, error: null });
    try {
      const articles = await dataApi.listFeedItems();
      set({
        articles,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load articles',
        isLoading: false,
      });
    }
  },

  markAsSeen: async (id: string) => {
    try {
      await dataApi.markItemSeen(id);
      // Update local state optimistically
      set((state) => ({
        articles: state.articles.map((article) =>
          article.id === id ? { ...article, seenAt: new Date().toISOString() } : article
        ),
      }));
    } catch (err) {
      console.error('Failed to mark item as seen:', err);
    }
  },

  toggleSentiment: (sentiment) => {
    set((state) => ({
      sentimentFilters: state.sentimentFilters.includes(sentiment)
        ? state.sentimentFilters.filter((s) => s !== sentiment)
        : [...state.sentimentFilters, sentiment],
      currentPage: 1,
    }));
  },

  toggleCategory: (category) => {
    set((state) => ({
      categoryFilters: state.categoryFilters.includes(category)
        ? state.categoryFilters.filter((c) => c !== category)
        : [...state.categoryFilters, category],
      currentPage: 1,
    }));
  },

  toggleShowHidden: () => {
    set((state) => ({ showHidden: !state.showHidden }));
  },

  setPage: (page) => {
    set({ currentPage: page });
  },

  resetFilters: () => {
    set({
      sentimentFilters: [],
      categoryFilters: [],
      showHidden: false,
      currentPage: 1,
    });
  },
}));
