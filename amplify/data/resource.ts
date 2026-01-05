import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  // Feed configuration (RSS sources to poll)
  Feed: a
    .model({
      url: a.string().required(),
      name: a.string().required(),
      isActive: a.boolean().default(true),
      isPriority: a.boolean().default(false),
      lastPolledAt: a.datetime(),
      pollIntervalMinutes: a.integer().default(15),
      // Error tracking
      lastError: a.string(),
      consecutiveErrors: a.integer().default(0),
      lastSuccessAt: a.datetime(),
    })
    .authorization((allow) => [allow.owner()]),

  // Individual feed items
  FeedItem: a
    .model({
      feedId: a.string().required(),
      feedName: a.string().required(),
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
      deletedFeedId: a.string(),   // Set when parent feed is deleted
    })
    .secondaryIndexes((index) => [
      index('storyGroupId'),
    ])
    .authorization((allow) => [
      // Lambda creates items, authenticated users can read/update
      allow.authenticated().to(['read', 'update']),
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
    ]),

  // User preferences (blocked words, hidden articles, display settings)
  UserPreferences: a
    .model({
      version: a.integer().default(1),
      blockedWords: a.json(),
      hiddenArticleIds: a.json(),
      articlesPerPage: a.integer().default(12),
      sentimentFilters: a.json(), // Array of active sentiment filters
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
