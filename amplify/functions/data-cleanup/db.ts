import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Table names from environment variables (set by Amplify)
const FEED_ITEM_TABLE = process.env.FEED_ITEM_TABLE_NAME || '';
const STORY_GROUP_TABLE = process.env.STORY_GROUP_TABLE_NAME || '';
const SOURCE_TABLE = process.env.SOURCE_TABLE_NAME || '';

/**
 * Mark all FeedItems belonging to a deleted source for cleanup.
 * Sets deletedSourceId so the daily cleanup job will delete them.
 * Uses the sourceId GSI for efficient querying.
 */
export async function markFeedItemsForDeletion(sourceId: string): Promise<number> {
  let markedCount = 0;
  let lastKey: Record<string, unknown> | undefined;

  // Mark each item with deletedSourceId and set TTL to expire soon
  const now = Math.floor(Date.now() / 1000);
  const expireSoon = now + 60 * 60; // Expire in 1 hour

  do {
    // Query using the sourceId GSI (much faster than scanning)
    const response = await docClient.send(
      new QueryCommand({
        TableName: FEED_ITEM_TABLE,
        IndexName: 'sourceId', // GSI name from schema
        KeyConditionExpression: 'sourceId = :sourceId',
        ExpressionAttributeValues: {
          ':sourceId': sourceId,
        },
        ProjectionExpression: 'id, storyGroupId',
        ExclusiveStartKey: lastKey,
      })
    );

    // Batch the updates for better performance
    const updatePromises = (response.Items || []).map(async (item) => {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: FEED_ITEM_TABLE,
            Key: { id: item.id },
            UpdateExpression: 'SET deletedSourceId = :sourceId, expiresAt = :expires',
            ExpressionAttributeValues: {
              ':sourceId': sourceId,
              ':expires': expireSoon,
            },
          })
        );
        // Decrement story group count
        if (item.storyGroupId) {
          await decrementStoryGroupCount(item.storyGroupId as string, 1);
        }
        return 1;
      } catch (error) {
        console.error(`Failed to mark item ${item.id}:`, error);
        return 0;
      }
    });

    const results = await Promise.all(updatePromises);
    markedCount += results.reduce<number>((sum, count) => sum + count, 0);

    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  return markedCount;
}

/**
 * Delete FeedItems that have been marked for deletion (have deletedSourceId set).
 * This is a fallback in case TTL hasn't cleaned them up yet.
 */
export async function deleteMarkedFeedItems(): Promise<number> {
  let deletedCount = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    // Scan for items marked for deletion (check both old and new field names)
    const response = await docClient.send(
      new ScanCommand({
        TableName: FEED_ITEM_TABLE,
        FilterExpression: 'attribute_exists(deletedSourceId) OR attribute_exists(deletedFeedId)',
        ProjectionExpression: 'id',
        Limit: 100,
        ExclusiveStartKey: lastKey,
      })
    );

    const items = response.Items || [];
    if (items.length === 0) break;

    // Batch delete items (max 25 per batch)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);

      try {
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [FEED_ITEM_TABLE]: batch.map((item) => ({
                DeleteRequest: { Key: { id: item.id } },
              })),
            },
          })
        );
        deletedCount += batch.length;
      } catch (error) {
        console.error('Batch delete failed:', error);
      }
    }

    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  return deletedCount;
}

/**
 * Decrement a story group's item count.
 * If count reaches 0 or below, the group will be cleaned up by cleanupOrphanedStoryGroups.
 */
export async function decrementStoryGroupCount(
  storyGroupId: string,
  count: number
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: STORY_GROUP_TABLE,
      Key: { id: storyGroupId },
      UpdateExpression: 'SET itemCount = itemCount - :count, updatedAt = :now',
      ExpressionAttributeValues: {
        ':count': count,
        ':now': now,
      },
    })
  );
}

/**
 * Delete StoryGroups that have itemCount <= 0.
 */
export async function cleanupOrphanedStoryGroups(): Promise<number> {
  let deletedCount = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const response = await docClient.send(
      new ScanCommand({
        TableName: STORY_GROUP_TABLE,
        FilterExpression: 'itemCount <= :zero',
        ExpressionAttributeValues: { ':zero': 0 },
        ProjectionExpression: 'id',
        Limit: 100,
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of response.Items || []) {
      try {
        await docClient.send(
          new DeleteCommand({
            TableName: STORY_GROUP_TABLE,
            Key: { id: item.id },
          })
        );
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete story group ${item.id}:`, error);
      }
    }

    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  return deletedCount;
}

/**
 * Delete a Source record by ID.
 */
export async function deleteSource(sourceId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: SOURCE_TABLE,
      Key: { id: sourceId },
    })
  );
}
