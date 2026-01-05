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
const SOURCE_TABLE = process.env.SOURCE_TABLE_NAME || '';
const FEED_ITEM_TABLE = process.env.FEED_ITEM_TABLE_NAME || '';
const STORY_GROUP_TABLE = process.env.STORY_GROUP_TABLE_NAME || '';

/**
 * Get existing external IDs for a source to avoid duplicates.
 */
export async function getExistingExternalIds(
  sourceId: string,
  externalIds: string[]
): Promise<Set<string>> {
  const existingIds = new Set<string>();

  // Query in batches to check which items already exist
  // For simplicity, we'll scan recent items and filter
  try {
    const response = await docClient.send(
      new ScanCommand({
        TableName: FEED_ITEM_TABLE,
        FilterExpression: 'sourceId = :sourceId',
        ExpressionAttributeValues: {
          ':sourceId': sourceId,
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
        FilterExpression: 'firstSeenAt >= :cutoff',
        ExpressionAttributeValues: {
          ':cutoff': cutoffIso,
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
  sourceId: string;
  sourceName: string;
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
        sourceId: item.sourceId,
        sourceName: item.sourceName,
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
        createdAt: now,
        updatedAt: now,
      },
    })
  );
}

// Re-export for use in dedup.ts
export { createStoryGroupInDb as createStoryGroup };

export interface DbSource {
  id: string;
  url: string;
  name: string;
  type: 'system' | 'custom';
  isActive: boolean;
}

/**
 * Get all active sources.
 */
export async function getAllActiveSources(): Promise<DbSource[]> {
  try {
    const response = await docClient.send(
      new ScanCommand({
        TableName: SOURCE_TABLE,
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
      type: (item.type as 'system' | 'custom') || 'system',
      isActive: item.isActive as boolean,
    }));
  } catch (error) {
    console.error('Error fetching sources:', error);
    return [];
  }
}

/**
 * Update source after successful poll - clear errors, update timestamps.
 */
export async function updateSourceSuccess(sourceId: string): Promise<void> {
  const now = new Date().toISOString();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: SOURCE_TABLE,
        Key: { id: sourceId },
        UpdateExpression: `
          SET lastPolledAt = :now,
              lastSuccessAt = :now,
              consecutiveErrors = :zero,
              updatedAt = :now
          REMOVE lastError
        `,
        ExpressionAttributeValues: {
          ':now': now,
          ':zero': 0,
        },
      })
    );
  } catch (error) {
    console.error(`Failed to update source success for ${sourceId}:`, error);
  }
}

/**
 * Update source after failed poll - increment error count, set error message.
 * Auto-disables source after 5 consecutive failures.
 */
export async function updateSourceError(sourceId: string, errorMessage: string): Promise<void> {
  const now = new Date().toISOString();
  const MAX_CONSECUTIVE_ERRORS = 5;

  try {
    // First, get current error count
    const getResponse = await docClient.send(
      new ScanCommand({
        TableName: SOURCE_TABLE,
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':id': sourceId,
        },
        ProjectionExpression: 'consecutiveErrors',
        Limit: 1,
      })
    );

    const currentErrors = (getResponse.Items?.[0]?.consecutiveErrors as number) || 0;
    const newErrorCount = currentErrors + 1;
    const shouldDisable = newErrorCount >= MAX_CONSECUTIVE_ERRORS;

    await docClient.send(
      new UpdateCommand({
        TableName: SOURCE_TABLE,
        Key: { id: sourceId },
        UpdateExpression: `
          SET lastPolledAt = :now,
              lastError = :error,
              consecutiveErrors = :errorCount,
              isActive = :active,
              updatedAt = :now
        `,
        ExpressionAttributeValues: {
          ':now': now,
          ':error': errorMessage.slice(0, 500), // Limit error message length
          ':errorCount': newErrorCount,
          ':active': !shouldDisable,
        },
      })
    );

    if (shouldDisable) {
      console.log(`Source ${sourceId} auto-disabled after ${MAX_CONSECUTIVE_ERRORS} consecutive errors`);
    }
  } catch (error) {
    console.error(`Failed to update source error for ${sourceId}:`, error);
  }
}
