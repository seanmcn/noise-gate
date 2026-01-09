import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { dataCleanupFunction } from '../functions/data-cleanup/resource';

const schema = a.schema({
  // Shared RSS sources (system defaults + user-added custom sources)
  Source: a
    .model({
      url: a.string().required(),
      name: a.string().required(),
      type: a.enum(['system', 'custom']),
      isActive: a.boolean().default(true),
      isPublic: a.boolean().default(true),
      isDefault: a.boolean().default(true),
      lastPolledAt: a.datetime(),
      pollIntervalMinutes: a.integer().default(15),
      // Error tracking
      lastError: a.string(),
      consecutiveErrors: a.integer().default(0),
      lastSuccessAt: a.datetime(),
      // For custom sources - who originally added it
      addedByUserId: a.string(),
      // Reference count for garbage collection
      subscriberCount: a.integer().default(0),
    })
    .authorization((allow) => [
      // Admin group has full CRUD access
      allow.group('admin').to(['read', 'create', 'update', 'delete']),
      // All authenticated users can read and create sources (for custom feeds)
      allow.authenticated().to(['read', 'create', 'update']),
      // Public users can read sources (via API key)
      allow.publicApiKey().to(['read']),
    ]),

  // User subscriptions to sources (controls visibility)
  UserSourceSubscription: a
    .model({
      sourceId: a.string().required(),
      isEnabled: a.boolean().default(true),
      // Denormalized for efficient queries
      sourceName: a.string(),
      sourceUrl: a.string(),
      sourceType: a.enum(['system', 'custom']),
    })
    .secondaryIndexes((index) => [index('sourceId')])
    .authorization((allow) => [
      allow.owner(),
      // Admin can read all subscriptions for stats
      allow.group('admin').to(['read']),
    ]),

  // Individual feed items
  FeedItem: a
    .model({
      sourceId: a.string().required(),
      sourceName: a.string().required(),
      externalId: a.string().required(),
      title: a.string().required(),
      url: a.string().required(),
      content: a.string(),
      publishedAt: a.datetime().required(),
      fetchedAt: a.datetime().required(),

      // AI classification (nullable until processed)
      category: a.enum([
        'world',
        'tech',
        'programming',
        'science',
        'business',
        'local',
        'health',
        'sports',
        'gaming',
        'entertainment',
        'humor',
        'politics',
        'other',
      ]),
      sentiment: a.enum(['positive', 'neutral', 'negative']),
      sentimentScore: a.integer(),
      importanceScore: a.integer(),
      summary: a.string(),
      aiProcessedAt: a.datetime(),

      // Content enrichment (full article extraction)
      enrichedContent: a.string(),
      enrichmentStatus: a.enum(['pending', 'completed', 'failed', 'skipped']),
      enrichedAt: a.datetime(),
      enrichmentError: a.string(),

      // Deduplication
      storyGroupId: a.string(),
      titleNormalized: a.string(),

      // User state
      seenAt: a.datetime(),
      isHidden: a.boolean().default(false),

      // Data retention
      expiresAt: a.integer(),      // Unix epoch for DynamoDB TTL
      deletedSourceId: a.string(), // Set when parent source is deleted
    })
    .secondaryIndexes((index) => [
      index('storyGroupId'),
      index('sourceId'),
    ])
    .authorization((allow) => [
      // Lambda creates items, authenticated users can read/update
      allow.authenticated().to(['read', 'update']),
      // Public users can read feed items (via API key)
      allow.publicApiKey().to(['read']),
    ]),

  // Story groups for deduplication
  StoryGroup: a
    .model({
      canonicalTitle: a.string().required(),
      canonicalUrl: a.string(),
      itemCount: a.integer().default(1),
      firstSeenAt: a.datetime().required(),
      lastUpdatedAt: a.datetime().required(),

      // Aggregated classification
      category: a.enum([
        'world',
        'tech',
        'programming',
        'science',
        'business',
        'local',
        'health',
        'sports',
        'gaming',
        'entertainment',
        'humor',
        'politics',
        'other',
      ]),
      sentiment: a.enum(['positive', 'neutral', 'negative']),
      sentimentScore: a.integer(),
      importanceScore: a.integer(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      // Public users can read story groups (via API key)
      allow.publicApiKey().to(['read']),
    ]),

  // User preferences (blocked words, hidden articles, display settings)
  UserPreferences: a
    .model({
      version: a.integer().default(1),
      ownerEmail: a.string(), // User's email for admin display
      blockedWords: a.json(),
      hiddenArticleIds: a.json(),
      articlesPerPage: a.integer().default(12),
      sentimentFilters: a.json(), // Array of active sentiment filters
      timeRange: a.enum(['today', 'yesterday', 'last7days', 'last14days']),
      // Paid feature stub
      customSourceLimit: a.integer().default(3),
      // Category management
      excludedCategories: a.json(), // Categories to always hide
      customLists: a.json(), // User-defined category lists
    })
    .authorization((allow) => [
      allow.owner(),
      // Admin can read all preferences for stats
      allow.group('admin').to(['read']),
    ]),

  // Custom mutation to delete a source and clean up associated articles
  deleteSourceWithCleanup: a
    .mutation()
    .arguments({
      sourceId: a.string().required(),
    })
    .returns(
      a.customType({
        success: a.boolean().required(),
        itemsMarked: a.integer().required(),
        error: a.string(),
      })
    )
    .authorization((allow) => [allow.group('admin')])
    .handler(a.handler.function(dataCleanupFunction)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    // Enable API key auth for public/guest read access
    apiKeyAuthorizationMode: {
      expiresInDays: 365,
    },
  },
});
