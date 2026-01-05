import type { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const SOURCE_TABLE = process.env.SOURCE_TABLE_NAME || '';

// System sources to seed (these are the default feeds all users can subscribe to)
const SYSTEM_SOURCES = [
  { url: 'https://www.reddit.com/r/technology/.rss', name: 'r/technology' },
  { url: 'https://www.reddit.com/r/programming/.rss', name: 'r/programming' },
  { url: 'https://hnrss.org/frontpage', name: 'Hacker News' },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Technology' },
];

interface SeederResult {
  sourcesChecked: number;
  sourcesCreated: number;
  sourcesSkipped: number;
  errors: string[];
}

export const handler: Handler = async (event): Promise<SeederResult> => {
  console.log('Source seeder triggered:', JSON.stringify(event));

  const results: SeederResult = {
    sourcesChecked: SYSTEM_SOURCES.length,
    sourcesCreated: 0,
    sourcesSkipped: 0,
    errors: [],
  };

  try {
    // Get existing system sources
    const existingResponse = await docClient.send(
      new ScanCommand({
        TableName: SOURCE_TABLE,
        FilterExpression: '#type = :system',
        ExpressionAttributeNames: {
          '#type': 'type',
          '#url': 'url',
        },
        ExpressionAttributeValues: {
          ':system': 'system',
        },
        ProjectionExpression: '#url',
      })
    );

    const existingUrls = new Set(
      (existingResponse.Items || []).map((item) => item.url as string)
    );

    console.log(`Found ${existingUrls.size} existing system sources`);

    // Create missing system sources
    for (const source of SYSTEM_SOURCES) {
      if (existingUrls.has(source.url)) {
        console.log(`Skipping existing source: ${source.name}`);
        results.sourcesSkipped++;
        continue;
      }

      try {
        const now = new Date().toISOString();
        const id = `src-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        await docClient.send(
          new PutCommand({
            TableName: SOURCE_TABLE,
            Item: {
              id,
              url: source.url,
              name: source.name,
              type: 'system',
              isActive: true,
              pollIntervalMinutes: 15,
              consecutiveErrors: 0,
              subscriberCount: 0,
              createdAt: now,
              updatedAt: now,
            },
          })
        );

        console.log(`Created system source: ${source.name}`);
        results.sourcesCreated++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to create source ${source.name}:`, message);
        results.errors.push(`${source.name}: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Source seeder failed:', message);
    results.errors.push(`Seeder error: ${message}`);
  }

  console.log('Source seeder completed:', results);
  return results;
};
