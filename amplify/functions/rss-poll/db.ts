import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { RSSItem } from './rss-parser';
import type { StoryGroup } from './dedup';

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Table names from environment variables (set by Amplify)
const FEED_TABLE = process.env.FEED_TABLE_NAME || '';
const FEED_ITEM_TABLE = process.env.FEED_ITEM_TABLE_NAME || '';
const STORY_GROUP_TABLE = process.env.STORY_GROUP_TABLE_NAME || '';

// Owner ID for items (since this is a personal app, we use a fixed owner)
// In a multi-user app, this would come from the authenticated user
const OWNER_ID = process.env.OWNER_ID || 'default-owner';

/**
 * Get existing external IDs for a feed to avoid duplicates.
 */
export async function getExistingExternalIds(
  feedId: string,
  externalIds: string[]
): Promise<Set<string>> {
  const existingIds = new Set<string>();

  // Query in batches to check which items already exist
  // For simplicity, we'll scan recent items and filter
  try {
    const response = await docClient.send(
      new ScanCommand({
        TableName: FEED_ITEM_TABLE,
        FilterExpression: 'feedId = :feedId AND #owner = :owner',
        ExpressionAttributeNames: {
          '#owner': 'owner',
        },
        ExpressionAttributeValues: {
          ':feedId': feedId,
          ':owner': OWNER_ID,
        },
        ProjectionExpression: 'externalId',
        Limit: 500,
      })
    );

    for (const item of response.Items || []) {
      if (item.externalId && externalIds.includes(item.externalId)) {
        existingIds.add(item.externalId);
      }
    }
  } catch (error) {
    console.error('Error checking existing IDs:', error);
  }

  return existingIds;
}

/**
 * Get recent story groups for deduplication.
 */
export async function getRecentStoryGroups(daysBack: number): Promise<StoryGroup[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffIso = cutoffDate.toISOString();

  try {
    const response = await docClient.send(
      new ScanCommand({
        TableName: STORY_GROUP_TABLE,
        FilterExpression: 'firstSeenAt >= :cutoff AND #owner = :owner',
        ExpressionAttributeNames: {
          '#owner': 'owner',
        },
        ExpressionAttributeValues: {
          ':cutoff': cutoffIso,
          ':owner': OWNER_ID,
        },
        Limit: 500,
      })
    );

    return (response.Items || []).map((item) => ({
      id: item.id as string,
      canonicalTitle: item.canonicalTitle as string,
      canonicalUrl: (item.canonicalUrl as string) || null,
      itemCount: (item.itemCount as number) || 1,
      firstSeenAt: item.firstSeenAt as string,
    }));
  } catch (error) {
    console.error('Error fetching story groups:', error);
    return [];
  }
}

/**
 * Create a new story group in DynamoDB.
 */
export async function createStoryGroupInDb(
  normalizedTitle: string,
  item: RSSItem
): Promise<StoryGroup> {
  const now = new Date().toISOString();
  const id = `sg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const storyGroup: StoryGroup = {
    id,
    canonicalTitle: normalizedTitle,
    canonicalUrl: item.url,
    itemCount: 1,
    firstSeenAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: STORY_GROUP_TABLE,
      Item: {
        id,
        canonicalTitle: normalizedTitle,
        canonicalUrl: item.url,
        itemCount: 1,
        firstSeenAt: now,
        lastUpdatedAt: now,
        owner: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  return storyGroup;
}

/**
 * Update story group item count.
 */
export async function updateStoryGroupCount(
  storyGroupId: string,
  newCount: number
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: STORY_GROUP_TABLE,
      Key: { id: storyGroupId },
      UpdateExpression: 'SET itemCount = :count, lastUpdatedAt = :now, updatedAt = :now',
      ExpressionAttributeValues: {
        ':count': newCount,
        ':now': now,
      },
    })
  );
}

// TTL: Items expire 14 days after published date
const TTL_DAYS = 14;

/**
 * Save a feed item to DynamoDB.
 */
export async function saveFeedItem(item: {
  feedId: string;
  feedName: string;
  externalId: string;
  title: string;
  url: string;
  content: string;
  publishedAt: string;
  storyGroupId: string;
  titleNormalized: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const id = `fi-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Calculate TTL: publishedAt + 14 days, as Unix epoch seconds
  const publishedDate = new Date(item.publishedAt);
  const expiresAt = Math.floor(publishedDate.getTime() / 1000) + (TTL_DAYS * 24 * 60 * 60);

  await docClient.send(
    new PutCommand({
      TableName: FEED_ITEM_TABLE,
      Item: {
        id,
        feedId: item.feedId,
        feedName: item.feedName,
        externalId: item.externalId,
        title: item.title,
        url: item.url,
        content: item.content,
        publishedAt: item.publishedAt,
        fetchedAt: now,
        expiresAt,
        storyGroupId: item.storyGroupId,
        titleNormalized: item.titleNormalized,
        isHidden: false,
        owner: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      },
    })
  );
}

// Re-export for use in dedup.ts
export { createStoryGroupInDb as createStoryGroup };

export interface DbFeed {
  id: string;
  url: string;
  name: string;
  owner: string;
  isActive: boolean;
}

/**
 * Get all active feeds from all users.
 */
export async function getAllActiveFeeds(): Promise<DbFeed[]> {
  try {
    const response = await docClient.send(
      new ScanCommand({
        TableName: FEED_TABLE,
        FilterExpression: 'isActive = :active',
        ExpressionAttributeValues: {
          ':active': true,
        },
      })
    );

    return (response.Items || []).map((item) => ({
      id: item.id as string,
      url: item.url as string,
      name: item.name as string,
      owner: item.owner as string,
      isActive: item.isActive as boolean,
    }));
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return [];
  }
}
