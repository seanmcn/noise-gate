// Sentiment types
export type Sentiment = 'positive' | 'neutral' | 'negative';

// Category types
export type Category =
  | 'world'
  | 'tech'
  | 'programming'
  | 'science'
  | 'business'
  | 'local'
  | 'health'
  | 'sports'
  | 'gaming'
  | 'entertainment'
  | 'humor'
  | 'politics'
  | 'other';

// Article interface (for frontend display)
export interface Article {
  id: string;
  title: string;
  snippet: string;
  url: string;
  feedName: string;
  sentiment: Sentiment;
  score: number; // 0-100 sentiment score
  publishedAt: string; // ISO 8601
  fetchedAt: string; // ISO 8601
  tags: string[];
  category: Category;
  storyGroupId?: string;
  isHidden?: boolean;
  seenAt?: string;
}

// User preferences stored in backend
export interface UserPreferences {
  id: string;
  version: number;
  blockedWords: string[];
  hiddenArticleIds: string[];
  articlesPerPage: number;
  sentimentFilters: Sentiment[]; // Active sentiment filters (empty = show all)
  createdAt: string;
  updatedAt: string;
}

// Feed configuration
export interface Feed {
  id: string;
  url: string;
  name: string;
  isActive: boolean;
  lastPolledAt?: string;
  pollIntervalMinutes: number;
}

// Frontend filter state (ephemeral, not persisted to backend)
export interface FilterState {
  sentiments: Sentiment[];
  categories: Category[];
  showHidden: boolean;
}

// Story group for deduplication display
export interface StoryGroup {
  id: string;
  canonicalTitle: string;
  canonicalUrl?: string;
  itemCount: number;
  firstSeenAt: string;
  category?: Category;
  sentiment?: Sentiment;
  sentimentScore?: number;
}

// Utility functions
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}
