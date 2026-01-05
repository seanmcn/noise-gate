import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Table name from environment variables
const FEED_ITEM_TABLE = process.env.FEED_ITEM_TABLE_NAME || '';

export interface FeedItemForEnrichment {
  id: string;
  url: string;
  title: string;
}

export type EnrichmentStatus = 'pending' | 'completed' | 'failed' | 'skipped';

/**
 * Get feed items that haven't been enriched yet.
 * Items with enrichmentStatus = null or 'pending' are eligible.
 */
export async function getUnenrichedItems(
  limit: number
): Promise<FeedItemForEnrichment[]> {
  const items: FeedItemForEnrichment[] = [];
  let lastKey: Record<string, unknown> | undefined;

  try {
    do {
      const response = await docClient.send(
        new ScanCommand({
          TableName: FEED_ITEM_TABLE,
          FilterExpression:
            'attribute_not_exists(enrichmentStatus) OR enrichmentStatus = :pending',
          ExpressionAttributeNames: {
            '#url': 'url',
          },
          ExpressionAttributeValues: {
            ':pending': 'pending',
          },
          ProjectionExpression: 'id, #url, title',
          ExclusiveStartKey: lastKey,
        })
      );

      for (const item of response.Items || []) {
        items.push({
          id: item.id as string,
          url: item.url as string,
          title: item.title as string,
        });
        if (items.length >= limit) break;
      }

      lastKey = response.LastEvaluatedKey;
    } while (lastKey && items.length < limit);

    return items;
  } catch (error) {
    console.error('Error fetching unenriched items:', error);
    return [];
  }
}

/**
 * Update a feed item with enriched content.
 */
export async function updateItemEnrichment(
  id: string,
  content: string | null,
  status: EnrichmentStatus,
  error?: string
): Promise<void> {
  const now = new Date().toISOString();

  const updateExpressionParts = [
    'enrichmentStatus = :status',
    'enrichedAt = :now',
    'updatedAt = :now',
  ];

  const expressionValues: Record<string, unknown> = {
    ':status': status,
    ':now': now,
  };

  if (content !== null) {
    updateExpressionParts.push('enrichedContent = :content');
    expressionValues[':content'] = content;
  }

  if (error) {
    updateExpressionParts.push('enrichmentError = :error');
    expressionValues[':error'] = error;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: FEED_ITEM_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
    })
  );
}
