import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import type { Article, UserPreferences, Feed, Sentiment, Category } from '@noise-gate/shared';
import { authService } from './auth-service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = generateClient<Schema>() as any;

// Helper to safely parse JSON fields from Amplify
function parseJsonField<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

export const dataApi = {
  /**
   * List all feed items.
   * Owner filtering is handled automatically by Amplify.
   */
  async listFeedItems(): Promise<Article[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, errors } = await client.models.FeedItem.list({
      limit: 100,
    });

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    // Only return items that have been processed by AI, sorted newest first
    const processedItems = (data || [])
      .filter((record: Record<string, unknown>) => record.aiProcessedAt)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = new Date(a.publishedAt as string).getTime();
        const dateB = new Date(b.publishedAt as string).getTime();
        return dateB - dateA; // Newest first
      });

    return processedItems.map((record: Record<string, unknown>) => ({
      id: record.id as string,
      title: record.title as string,
      snippet: (record.content as string) || '',
      url: record.url as string,
      feedId: record.feedId as string,
      feedName: (record.feedName as string) || 'Unknown',
      sentiment: (record.sentiment as string) as Sentiment,
      score: (record.sentimentScore as number) || 50,
      importanceScore: (record.importanceScore as number) || undefined,
      summary: (record.summary as string) || undefined,
      publishedAt: record.publishedAt as string,
      fetchedAt: record.fetchedAt as string,
      tags: [],
      category: (record.category as string) as Category,
      storyGroupId: (record.storyGroupId as string) || undefined,
      isHidden: (record.isHidden as boolean) || false,
      seenAt: (record.seenAt as string) || undefined,
    }));
  },

  /**
   * Get user preferences.
   * Creates default preferences if none exist.
   */
  async getPreferences(): Promise<UserPreferences> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, errors } = await client.models.UserPreferences.list();

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    const record = (data || [])[0] as Record<string, unknown> | undefined;

    if (record) {
      return {
        id: record.id as string,
        version: (record.version as number) || 1,
        blockedWords: parseJsonField<string[]>(record.blockedWords, []),
        hiddenArticleIds: parseJsonField<string[]>(record.hiddenArticleIds, []),
        articlesPerPage: (record.articlesPerPage as number) || 12,
        sentimentFilters: parseJsonField<Sentiment[]>(record.sentimentFilters, []),
        createdAt: record.createdAt as string,
        updatedAt: record.updatedAt as string,
      };
    }

    // Create default preferences
    return this.putPreferences({
      id: '',
      version: 1,
      blockedWords: [],
      hiddenArticleIds: [],
      articlesPerPage: 12,
      sentimentFilters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Save user preferences.
   */
  async putPreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existing } = await client.models.UserPreferences.list();
    const record = (existing || [])[0] as Record<string, unknown> | undefined;

    let result: Record<string, unknown>;
    if (record) {
      const { data, errors } = await client.models.UserPreferences.update({
        id: record.id,
        version: 1,
        blockedWords: JSON.stringify(prefs.blockedWords),
        hiddenArticleIds: JSON.stringify(prefs.hiddenArticleIds),
        articlesPerPage: prefs.articlesPerPage,
        sentimentFilters: JSON.stringify(prefs.sentimentFilters),
      });
      if (errors?.length) throw new Error(errors[0].message);
      result = data;
    } else {
      const { data, errors } = await client.models.UserPreferences.create({
        version: 1,
        blockedWords: JSON.stringify(prefs.blockedWords),
        hiddenArticleIds: JSON.stringify(prefs.hiddenArticleIds),
        articlesPerPage: prefs.articlesPerPage,
        sentimentFilters: JSON.stringify(prefs.sentimentFilters),
      });
      if (errors?.length) throw new Error(errors[0].message);
      result = data;
    }

    if (!result) {
      throw new Error('Failed to save preferences');
    }

    return {
      id: result.id as string,
      version: (result.version as number) || 1,
      blockedWords: parseJsonField<string[]>(result.blockedWords, []),
      hiddenArticleIds: parseJsonField<string[]>(result.hiddenArticleIds, []),
      articlesPerPage: (result.articlesPerPage as number) || 12,
      sentimentFilters: parseJsonField<Sentiment[]>(result.sentimentFilters, []),
      createdAt: result.createdAt as string,
      updatedAt: result.updatedAt as string,
    };
  },

  /**
   * List feed items for a specific feed.
   */
  async listFeedItemsByFeed(feedId: string): Promise<Article[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, errors } = await client.models.FeedItem.list({
      filter: { feedId: { eq: feedId } },
      limit: 100,
    });

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    return (data || [])
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = new Date(a.publishedAt as string).getTime();
        const dateB = new Date(b.publishedAt as string).getTime();
        return dateB - dateA;
      })
      .map((record: Record<string, unknown>) => ({
        id: record.id as string,
        title: record.title as string,
        snippet: (record.content as string) || '',
        url: record.url as string,
        feedId: record.feedId as string,
        feedName: (record.feedName as string) || 'Unknown',
        sentiment: (record.sentiment as string) as Sentiment,
        score: (record.sentimentScore as number) || 50,
        importanceScore: (record.importanceScore as number) || undefined,
        summary: (record.summary as string) || undefined,
        publishedAt: record.publishedAt as string,
        fetchedAt: record.fetchedAt as string,
        tags: [],
        category: (record.category as string) as Category,
        storyGroupId: (record.storyGroupId as string) || undefined,
        isHidden: (record.isHidden as boolean) || false,
        seenAt: (record.seenAt as string) || undefined,
      }));
  },

  /**
   * Mark a feed item as seen.
   */
  async markItemSeen(itemId: string): Promise<void> {
    const { errors } = await client.models.FeedItem.update({
      id: itemId,
      seenAt: new Date().toISOString(),
    });
    if (errors?.length) throw new Error(errors[0].message);
  },

  /**
   * Hide/unhide a feed item.
   */
  async setItemHidden(itemId: string, hidden: boolean): Promise<void> {
    const { errors } = await client.models.FeedItem.update({
      id: itemId,
      isHidden: hidden,
    });
    if (errors?.length) throw new Error(errors[0].message);
  },

  // ==================== Feed Management ====================

  /**
   * List user's RSS feeds.
   */
  async listFeeds(): Promise<Feed[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, errors } = await client.models.Feed.list();

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    return (data || []).map((record: Record<string, unknown>) => ({
      id: record.id as string,
      url: record.url as string,
      name: record.name as string,
      isActive: record.isActive as boolean,
      isPriority: (record.isPriority as boolean) || false,
      lastPolledAt: (record.lastPolledAt as string) || undefined,
      pollIntervalMinutes: (record.pollIntervalMinutes as number) || 15,
      lastError: (record.lastError as string) || undefined,
      consecutiveErrors: (record.consecutiveErrors as number) || 0,
      lastSuccessAt: (record.lastSuccessAt as string) || undefined,
    }));
  },

  /**
   * Create a new RSS feed.
   */
  async createFeed(feed: Omit<Feed, 'id' | 'lastPolledAt'>): Promise<Feed> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, errors } = await client.models.Feed.create({
      url: feed.url,
      name: feed.name,
      isActive: feed.isActive,
      isPriority: feed.isPriority,
      pollIntervalMinutes: feed.pollIntervalMinutes,
    });

    if (errors?.length) throw new Error(errors[0].message);
    if (!data) throw new Error('Failed to create feed');

    return {
      id: data.id as string,
      url: data.url as string,
      name: data.name as string,
      isActive: data.isActive as boolean,
      isPriority: (data.isPriority as boolean) || false,
      lastPolledAt: (data.lastPolledAt as string) || undefined,
      pollIntervalMinutes: (data.pollIntervalMinutes as number) || 15,
      lastError: (data.lastError as string) || undefined,
      consecutiveErrors: (data.consecutiveErrors as number) || 0,
      lastSuccessAt: (data.lastSuccessAt as string) || undefined,
    };
  },

  /**
   * Update an RSS feed.
   */
  async updateFeed(id: string, updates: Partial<Omit<Feed, 'id'>>): Promise<Feed> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, errors } = await client.models.Feed.update({
      id,
      ...updates,
    });

    if (errors?.length) throw new Error(errors[0].message);
    if (!data) throw new Error('Failed to update feed');

    return {
      id: data.id as string,
      url: data.url as string,
      name: data.name as string,
      isActive: data.isActive as boolean,
      isPriority: (data.isPriority as boolean) || false,
      lastPolledAt: (data.lastPolledAt as string) || undefined,
      pollIntervalMinutes: (data.pollIntervalMinutes as number) || 15,
      lastError: (data.lastError as string) || undefined,
      consecutiveErrors: (data.consecutiveErrors as number) || 0,
      lastSuccessAt: (data.lastSuccessAt as string) || undefined,
    };
  },

  /**
   * Delete an RSS feed.
   * Note: Associated FeedItems will be cleaned up by the daily data-cleanup Lambda.
   * Items are marked with deletedFeedId and will be deleted by TTL or the scheduled cleanup.
   */
  async deleteFeed(id: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { errors } = await client.models.Feed.delete({ id });
    if (errors?.length) throw new Error(errors[0].message);

    // Note: The data-cleanup Lambda runs daily to clean up orphaned items.
    // For immediate cleanup, use the "Data: Cleanup Now" VS Code task.
  },

  /**
   * Seed default feeds for a new user.
   */
  async seedDefaultFeeds(): Promise<Feed[]> {
    const DEFAULT_FEEDS = [
      { url: 'https://www.reddit.com/r/technology/.rss', name: 'r/technology' },
      { url: 'https://www.reddit.com/r/programming/.rss', name: 'r/programming' },
      { url: 'https://hnrss.org/frontpage', name: 'Hacker News' },
      { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News' },
      { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Technology' },
    ];

    const feeds: Feed[] = [];
    for (const feed of DEFAULT_FEEDS) {
      const created = await this.createFeed({
        ...feed,
        isActive: true,
        isPriority: false,
        pollIntervalMinutes: 15,
      });
      feeds.push(created);
    }
    return feeds;
  },
};
