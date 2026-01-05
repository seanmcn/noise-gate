import { create } from 'zustand';
import type { Article, Sentiment, Category } from '@noise-gate/shared';
import { dataApi } from '@/lib/data-api';

export type SortOption = 'newest' | 'importance';

// Load collapseDuplicates from localStorage
const getStoredCollapseDuplicates = (): boolean => {
  try {
    return localStorage.getItem('collapseDuplicates') === 'true';
  } catch {
    return true; // Default to collapsed
  }
};

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
  sortBy: SortOption;
  collapseDuplicates: boolean;

  // Pagination
  currentPage: number;

  // Actions
  loadArticles: () => Promise<void>;
  markAsSeen: (id: string) => Promise<void>;

  // Filter actions
  toggleSentiment: (sentiment: Sentiment) => void;
  setSentimentFilters: (filters: Sentiment[]) => void;
  toggleCategory: (category: Category) => void;
  toggleShowHidden: () => void;
  setSortBy: (sort: SortOption) => void;
  setCollapseDuplicates: (collapse: boolean) => void;
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
  sortBy: 'newest',
  collapseDuplicates: getStoredCollapseDuplicates(),
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

  setSentimentFilters: (filters) => {
    set({ sentimentFilters: filters, currentPage: 1 });
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

  setSortBy: (sort) => {
    set({ sortBy: sort, currentPage: 1 });
  },

  setCollapseDuplicates: (collapse) => {
    try {
      localStorage.setItem('collapseDuplicates', collapse.toString());
    } catch {
      // Ignore localStorage errors
    }
    set({ collapseDuplicates: collapse, currentPage: 1 });
  },

  setPage: (page) => {
    set({ currentPage: page });
  },

  resetFilters: () => {
    set({
      sentimentFilters: [],
      categoryFilters: [],
      showHidden: false,
      sortBy: 'newest',
      currentPage: 1,
    });
  },
}));
