import { create } from 'zustand';
import type { Article, Sentiment, Category } from '@minfeed/shared';

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

  // Auth state
  isAuthenticated: boolean;

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

  // Data actions (called by React Query sync)
  setArticles: (articles: Article[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;

  // Article actions
  markAsSeen: (id: string) => void;

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
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sentimentFilters: [],
  categoryFilters: [],
  showHidden: false,
  sortBy: 'newest',
  collapseDuplicates: getStoredCollapseDuplicates(),
  currentPage: 1,

  // Data actions (synced from React Query)
  setArticles: (articles) => {
    set({ articles, error: null });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  setAuthenticated: (isAuthenticated) => {
    set({ isAuthenticated });
  },

  // Optimistic update for marking seen (actual API call is in useMarkSeenMutation)
  markAsSeen: (id: string) => {
    set((state) => ({
      articles: state.articles.map((article) =>
        article.id === id ? { ...article, seenAt: new Date().toISOString() } : article
      ),
    }));
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
