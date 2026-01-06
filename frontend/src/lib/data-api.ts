import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import type { Article, UserPreferences, Source, UserSourceSubscription, Sentiment, Category, SourceType, TimeRange, CustomList } from '@minfeed/shared';
import { authService } from './auth-service';

// Lazy-initialized clients (created after Amplify is configured)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _publicClient: any = null;

// Authenticated client (uses user pool auth)
function getClient() {
  if (!_client) {
    _client = generateClient<Schema>();
  }
  return _client;
}

// Public client (uses API key auth for unauthenticated access)
function getPublicClient() {
  if (!_publicClient) {
    _publicClient = generateClient<Schema>({ authMode: 'apiKey' });
  }
  return _publicClient;
}

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
   * List feed items from all system sources (public, no auth required).
   * Used for the logged-out feed view.
   */
  async listPublicFeedItems(): Promise<Article[]> {
    // First get system sources that are public
    const publicClient = getPublicClient();
    const { data: sources, errors: sourceErrors } = await publicClient.models.Source.list({
      filter: {
        type: { eq: 'system' },
        isPublic: { eq: true },
      },
    });

    if (sourceErrors?.length) {
      throw new Error(sourceErrors[0].message);
    }

    const systemSourceIds = new Set((sources || []).map((s: Record<string, unknown>) => s.id as string));

    // Fetch all feed items
    const { data, errors } = await publicClient.models.FeedItem.list({
      limit: 500,
    });

    // Filter to system sources and AI processed items, sorted newest first
    // Also filter out null/corrupted items (GraphQL returns null for items with missing required fields)
    const processedItems = (data || [])
      .filter((record): record is Record<string, unknown> => record !== null && record !== undefined)
      .filter((record: Record<string, unknown>) => {
        const hasRequired = record.id && record.title && record.sourceId && record.publishedAt;
        const hasAiProcessed = !!record.aiProcessedAt;
        const matchesSource = systemSourceIds.has(record.sourceId as string);
        return hasRequired && hasAiProcessed && matchesSource;
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const dateA = new Date(a.publishedAt as string).getTime();
        const dateB = new Date(b.publishedAt as string).getTime();
        return dateB - dateA;
      });

    return processedItems.map((record: Record<string, unknown>) => ({
      id: record.id as string,
      title: record.title as string,
      snippet: (record.content as string) || '',
      url: record.url as string,
      sourceId: record.sourceId as string,
      sourceName: (record.sourceName as string) || 'Unknown',
      sentiment: (record.sentiment as string) as Sentiment,
      score: (record.sentimentScore as number) || 50,
      importanceScore: (record.importanceScore as number) || undefined,
      summary: (record.summary as string) || undefined,
      publishedAt: record.publishedAt as string,
      fetchedAt: record.fetchedAt as string,
      tags: [],
      category: (record.category as string) as Category,
      storyGroupId: (record.storyGroupId as string) || undefined,
      isHidden: false, // Public view doesn't have hidden state
      seenAt: undefined, // Public view doesn't track read state
    }));
  },

  /**
   * List feed items for user's enabled subscriptions only.
   */
  async listFeedItems(): Promise<Article[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's subscriptions to filter by enabled sources
    const subscriptions = await this.listSubscriptions();
    const enabledSourceIds = new Set(
      subscriptions.filter(s => s.isEnabled).map(s => s.sourceId)
    );

    // If no enabled sources, return empty
    if (enabledSourceIds.size === 0) {
      return [];
    }

    const client = getClient();
    const { data, errors } = await client.models.FeedItem.list({
      limit: 500, // Fetch more since we'll filter client-side
    });

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    // Filter by enabled sources and AI processing, sorted newest first
    const processedItems = (data || [])
      .filter((record: Record<string, unknown>) =>
        record.aiProcessedAt && enabledSourceIds.has(record.sourceId as string)
      )
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
      sourceId: record.sourceId as string,
      sourceName: (record.sourceName as string) || 'Unknown',
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

    const client = getClient();
    const { data, errors } = await client.models.UserPreferences.list();

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    const record = (data || [])[0] as Record<string, unknown> | undefined;

    if (record) {
      return {
        id: record.id as string,
        version: (record.version as number) || 1,
        ownerEmail: (record.ownerEmail as string) || undefined,
        blockedWords: parseJsonField<string[]>(record.blockedWords, []),
        hiddenArticleIds: parseJsonField<string[]>(record.hiddenArticleIds, []),
        articlesPerPage: (record.articlesPerPage as number) || 12,
        sentimentFilters: parseJsonField<Sentiment[]>(record.sentimentFilters, []),
        timeRange: (record.timeRange as TimeRange) || 'today',
        customSourceLimit: (record.customSourceLimit as number) || 3,
        excludedCategories: parseJsonField<Category[]>(record.excludedCategories, []),
        customLists: parseJsonField<CustomList[]>(record.customLists, []),
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
      timeRange: 'today',
      customSourceLimit: 3,
      excludedCategories: [],
      customLists: [],
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

    const client = getClient();
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
        timeRange: prefs.timeRange,
        excludedCategories: JSON.stringify(prefs.excludedCategories),
        customLists: JSON.stringify(prefs.customLists),
      });
      if (errors?.length) throw new Error(errors[0].message);
      result = data;
    } else {
      const { data, errors } = await client.models.UserPreferences.create({
        version: 1,
        ownerEmail: user.email,
        blockedWords: JSON.stringify(prefs.blockedWords),
        hiddenArticleIds: JSON.stringify(prefs.hiddenArticleIds),
        articlesPerPage: prefs.articlesPerPage,
        sentimentFilters: JSON.stringify(prefs.sentimentFilters),
        timeRange: prefs.timeRange,
        excludedCategories: JSON.stringify(prefs.excludedCategories),
        customLists: JSON.stringify(prefs.customLists),
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
      ownerEmail: (result.ownerEmail as string) || undefined,
      blockedWords: parseJsonField<string[]>(result.blockedWords, []),
      hiddenArticleIds: parseJsonField<string[]>(result.hiddenArticleIds, []),
      articlesPerPage: (result.articlesPerPage as number) || 12,
      sentimentFilters: parseJsonField<Sentiment[]>(result.sentimentFilters, []),
      timeRange: (result.timeRange as TimeRange) || 'today',
      customSourceLimit: (result.customSourceLimit as number) || 3,
      excludedCategories: parseJsonField<Category[]>(result.excludedCategories, []),
      customLists: parseJsonField<CustomList[]>(result.customLists, []),
      createdAt: result.createdAt as string,
      updatedAt: result.updatedAt as string,
    };
  },

  /**
   * List feed items for a specific source.
   */
  async listFeedItemsBySource(sourceId: string): Promise<Article[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();
    const { data, errors } = await client.models.FeedItem.list({
      filter: { sourceId: { eq: sourceId } },
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
        sourceId: record.sourceId as string,
        sourceName: (record.sourceName as string) || 'Unknown',
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
    const client = getClient();
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
    const client = getClient();
    const { errors } = await client.models.FeedItem.update({
      id: itemId,
      isHidden: hidden,
    });
    if (errors?.length) throw new Error(errors[0].message);
  },

  // ==================== Source Management ====================

  /**
   * List all sources (both system and custom).
   */
  async listSources(): Promise<Source[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();
    const { data, errors } = await client.models.Source.list();

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    return (data || []).map((record: Record<string, unknown>) => ({
      id: record.id as string,
      url: record.url as string,
      name: record.name as string,
      type: (record.type as SourceType) || 'system',
      isActive: record.isActive as boolean,
      isPublic: (record.isPublic as boolean) ?? true,
      isDefault: (record.isDefault as boolean) ?? true,
      lastPolledAt: (record.lastPolledAt as string) || undefined,
      pollIntervalMinutes: (record.pollIntervalMinutes as number) || 15,
      lastError: (record.lastError as string) || undefined,
      consecutiveErrors: (record.consecutiveErrors as number) || 0,
      lastSuccessAt: (record.lastSuccessAt as string) || undefined,
      addedByUserId: (record.addedByUserId as string) || undefined,
      subscriberCount: (record.subscriberCount as number) || 0,
    }));
  },

  /**
   * Get a source by URL (for deduplication check).
   */
  async getSourceByUrl(url: string): Promise<Source | null> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();
    const { data, errors } = await client.models.Source.list({
      filter: { url: { eq: url } },
      limit: 1,
    });

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    const record = (data || [])[0] as Record<string, unknown> | undefined;
    if (!record) return null;

    return {
      id: record.id as string,
      url: record.url as string,
      name: record.name as string,
      type: (record.type as SourceType) || 'custom',
      isActive: record.isActive as boolean,
      isPublic: (record.isPublic as boolean) ?? true,
      isDefault: (record.isDefault as boolean) ?? true,
      lastPolledAt: (record.lastPolledAt as string) || undefined,
      pollIntervalMinutes: (record.pollIntervalMinutes as number) || 15,
      lastError: (record.lastError as string) || undefined,
      consecutiveErrors: (record.consecutiveErrors as number) || 0,
      lastSuccessAt: (record.lastSuccessAt as string) || undefined,
      addedByUserId: (record.addedByUserId as string) || undefined,
      subscriberCount: (record.subscriberCount as number) || 0,
    };
  },

  // ==================== Subscription Management ====================

  /**
   * List user's source subscriptions.
   */
  async listSubscriptions(): Promise<UserSourceSubscription[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();
    const { data, errors } = await client.models.UserSourceSubscription.list();

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    return (data || []).map((record: Record<string, unknown>) => ({
      id: record.id as string,
      sourceId: record.sourceId as string,
      isEnabled: record.isEnabled as boolean,
      sourceName: (record.sourceName as string) || undefined,
      sourceUrl: (record.sourceUrl as string) || undefined,
      sourceType: (record.sourceType as SourceType) || undefined,
      owner: (record.owner as string) || undefined,
    }));
  },

  /**
   * Create a subscription to a source.
   */
  async createSubscription(source: Source): Promise<UserSourceSubscription> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();
    const { data, errors } = await client.models.UserSourceSubscription.create({
      sourceId: source.id,
      isEnabled: true,
      sourceName: source.name,
      sourceUrl: source.url,
      sourceType: source.type,
    });

    if (errors?.length) throw new Error(errors[0].message);
    if (!data) throw new Error('Failed to create subscription');

    return {
      id: data.id as string,
      sourceId: data.sourceId as string,
      isEnabled: data.isEnabled as boolean,
      sourceName: (data.sourceName as string) || undefined,
      sourceUrl: (data.sourceUrl as string) || undefined,
      sourceType: (data.sourceType as SourceType) || undefined,
      owner: (data.owner as string) || undefined,
    };
  },

  /**
   * Update a subscription (toggle enabled/disabled).
   */
  async updateSubscription(id: string, isEnabled: boolean): Promise<UserSourceSubscription> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();
    const { data, errors } = await client.models.UserSourceSubscription.update({
      id,
      isEnabled,
    });

    if (errors?.length) throw new Error(errors[0].message);
    if (!data) throw new Error('Failed to update subscription');

    return {
      id: data.id as string,
      sourceId: data.sourceId as string,
      isEnabled: data.isEnabled as boolean,
      sourceName: (data.sourceName as string) || undefined,
      sourceUrl: (data.sourceUrl as string) || undefined,
      sourceType: (data.sourceType as SourceType) || undefined,
      owner: (data.owner as string) || undefined,
    };
  },

  /**
   * Delete a subscription.
   */
  async deleteSubscription(id: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();
    const { errors } = await client.models.UserSourceSubscription.delete({ id });
    if (errors?.length) throw new Error(errors[0].message);
  },

  /**
   * Add a custom source.
   * If the URL already exists, just subscribe to it.
   * Otherwise, create the source and subscribe.
   */
  async addCustomSource(url: string, name: string): Promise<{ source: Source; subscription: UserSourceSubscription }> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();

    // Check if source already exists
    let source = await this.getSourceByUrl(url);

    if (!source) {
      // Create new source
      const { data, errors } = await client.models.Source.create({
        url,
        name,
        type: 'custom',
        isActive: true,
        pollIntervalMinutes: 15,
        consecutiveErrors: 0,
        subscriberCount: 1,
        addedByUserId: user.id,
      });

      if (errors?.length) throw new Error(errors[0].message);
      if (!data) throw new Error('Failed to create source');

      source = {
        id: data.id as string,
        url: data.url as string,
        name: data.name as string,
        type: 'custom',
        isActive: true,
        isPublic: false,
        isDefault: false,
        pollIntervalMinutes: 15,
        consecutiveErrors: 0,
        subscriberCount: 1,
        addedByUserId: user.id,
      };
    } else {
      // Increment subscriber count
      await client.models.Source.update({
        id: source.id,
        subscriberCount: source.subscriberCount + 1,
      });
      source.subscriberCount++;
    }

    // Create subscription
    const subscription = await this.createSubscription(source);

    return { source, subscription };
  },

  /**
   * Remove a custom source subscription.
   * If this was the last subscriber, delete the source entirely.
   */
  async removeCustomSource(subscriptionId: string, sourceId: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const client = getClient();

    // Delete subscription
    await this.deleteSubscription(subscriptionId);

    // Decrement subscriber count
    const { data: sources } = await client.models.Source.list({
      filter: { id: { eq: sourceId } },
      limit: 1,
    });

    const source = (sources || [])[0] as Record<string, unknown> | undefined;
    if (source) {
      const newCount = Math.max(0, ((source.subscriberCount as number) || 1) - 1);

      if (newCount === 0) {
        // Delete the source entirely
        await client.models.Source.delete({ id: sourceId });
      } else {
        // Update subscriber count
        await client.models.Source.update({
          id: sourceId,
          subscriberCount: newCount,
        });
      }
    }
  },

  /**
   * Subscribe to all system sources (for new users).
   */
  async subscribeToSystemSources(): Promise<UserSourceSubscription[]> {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const sources = await this.listSources();
    const systemSources = sources.filter(s => s.type === 'system');
    const subscriptions: UserSourceSubscription[] = [];

    for (const source of systemSources) {
      const subscription = await this.createSubscription(source);
      subscriptions.push(subscription);
    }

    return subscriptions;
  },

  // ==================== Admin Operations ====================

  /**
   * List all system sources (admin only).
   */
  async listSystemSources(): Promise<Source[]> {
    const client = getClient();
    const { data, errors } = await client.models.Source.list({
      filter: { type: { eq: 'system' } },
    });

    if (errors?.length) {
      throw new Error(errors[0].message);
    }

    return (data || []).map((record: Record<string, unknown>) => ({
      id: record.id as string,
      url: record.url as string,
      name: record.name as string,
      type: 'system' as SourceType,
      isActive: (record.isActive as boolean) ?? true,
      isPublic: (record.isPublic as boolean) ?? true,
      isDefault: (record.isDefault as boolean) ?? true,
      lastPolledAt: (record.lastPolledAt as string) || undefined,
      pollIntervalMinutes: (record.pollIntervalMinutes as number) || 15,
      lastError: (record.lastError as string) || undefined,
      consecutiveErrors: (record.consecutiveErrors as number) || 0,
      lastSuccessAt: (record.lastSuccessAt as string) || undefined,
      addedByUserId: (record.addedByUserId as string) || undefined,
      subscriberCount: (record.subscriberCount as number) || 0,
    }));
  },

  /**
   * Create a new system source (admin only).
   */
  async createSystemSource(url: string, name: string, isDefault = true): Promise<Source> {
    const client = getClient();
    const { data, errors } = await client.models.Source.create({
      url,
      name,
      type: 'system',
      isActive: true,
      isPublic: true,
      isDefault,
      pollIntervalMinutes: 15,
      consecutiveErrors: 0,
      subscriberCount: 0,
    });

    if (errors?.length) throw new Error(errors[0].message);
    if (!data) throw new Error('Failed to create source');

    return {
      id: data.id as string,
      url: data.url as string,
      name: data.name as string,
      type: 'system',
      isActive: true,
      isPublic: true,
      isDefault,
      pollIntervalMinutes: 15,
      consecutiveErrors: 0,
      subscriberCount: 0,
    };
  },

  /**
   * Update a system source (admin only).
   */
  async updateSystemSource(
    id: string,
    updates: { url?: string; name?: string; isActive?: boolean; isPublic?: boolean; isDefault?: boolean }
  ): Promise<void> {
    const client = getClient();
    const { errors } = await client.models.Source.update({
      id,
      ...updates,
    });

    if (errors?.length) throw new Error(errors[0].message);
  },

  /**
   * Delete a system source (admin only).
   */
  async deleteSystemSource(id: string): Promise<void> {
    const client = getClient();
    const { errors } = await client.models.Source.delete({ id });
    if (errors?.length) throw new Error(errors[0].message);
  },

  /**
   * Get all user preferences for admin stats.
   */
  async listAllUserPreferences(): Promise<Record<string, unknown>[]> {
    const client = getClient();
    const { data, errors } = await client.models.UserPreferences.list();
    if (errors?.length) throw new Error(errors[0].message);
    return data || [];
  },

  /**
   * Get all user subscriptions for admin stats.
   */
  async listAllSubscriptions(): Promise<Record<string, unknown>[]> {
    const client = getClient();
    const { data, errors } = await client.models.UserSourceSubscription.list();
    if (errors?.length) throw new Error(errors[0].message);
    return data || [];
  },
};
