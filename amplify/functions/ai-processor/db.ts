import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { FeedItemForClassification, ClassificationResult } from './openai';

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Table names from environment variables
const FEED_ITEM_TABLE = process.env.FEED_ITEM_TABLE_NAME || '';
const STORY_GROUP_TABLE = process.env.STORY_GROUP_TABLE_NAME || '';
const OWNER_ID = process.env.OWNER_ID || 'default-owner';

/**
 * Get feed items that haven't been processed by AI yet.
 * Uses pagination to find items across the entire table.
 */
export async function getUnprocessedItems(
  limit: number
): Promise<FeedItemForClassification[]> {
  const items: FeedItemForClassification[] = [];
  let lastKey: Record<string, unknown> | undefined;

  try {
    do {
      const response = await docClient.send(
        new ScanCommand({
          TableName: FEED_ITEM_TABLE,
          FilterExpression:
            'attribute_not_exists(aiProcessedAt) AND #owner = :owner',
          ExpressionAttributeNames: {
            '#owner': 'owner',
          },
          ExpressionAttributeValues: {
            ':owner': OWNER_ID,
          },
          ProjectionExpression: 'id, title, content, storyGroupId',
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of response.Items || []) {
        items.push({
          id: item.id as string,
          title: item.title as string,
          content: (item.content as string) || '',
          storyGroupId: (item.storyGroupId as string) || '',
        });
        if (items.length >= limit) break;
      }

      lastKey = response.LastEvaluatedKey;
    } while (lastKey && items.length < limit);

    return items;
  } catch (error) {
    console.error('Error fetching unprocessed items:', error);
    return [];
  }
}

/**
 * Update a feed item with classification results.
 */
export async function updateItemClassification(
  result: ClassificationResult
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: FEED_ITEM_TABLE,
      Key: { id: result.id },
      UpdateExpression: `
        SET category = :category,
            sentiment = :sentiment,
            sentimentScore = :score,
            importanceScore = :importance,
            summary = :summary,
            aiProcessedAt = :now,
            updatedAt = :now
      `,
      ExpressionAttributeValues: {
        ':category': result.category,
        ':sentiment': result.sentiment,
        ':score': result.sentimentScore,
        ':importance': result.importanceScore,
        ':summary': result.summary,
        ':now': now,
      },
    })
  );
}

/**
 * Update a story group with classification results.
 * Only updates if the story group doesn't have classification yet.
 */
export async function updateStoryGroupClassification(
  result: ClassificationResult
): Promise<void> {
  if (!result.storyGroupId) return;

  const now = new Date().toISOString();

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: STORY_GROUP_TABLE,
        Key: { id: result.storyGroupId },
        UpdateExpression: `
          SET category = :category,
              sentiment = :sentiment,
              sentimentScore = :score,
              importanceScore = :importance,
              updatedAt = :now
        `,
        ConditionExpression: 'attribute_not_exists(category)',
        ExpressionAttributeValues: {
          ':category': result.category,
          ':sentiment': result.sentiment,
          ':score': result.sentimentScore,
          ':importance': result.importanceScore,
          ':now': now,
        },
      })
    );
  } catch (error: unknown) {
    // Ignore conditional check failures (story group already has classification)
    if ((error as { name?: string }).name === 'ConditionalCheckFailedException') {
      return;
    }
    throw error;
  }
}
