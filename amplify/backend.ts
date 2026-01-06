import { defineBackend } from '@aws-amplify/backend';
import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Rule, Schedule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { rssPollFunction } from './functions/rss-poll/resource';
import { contentEnricherFunction } from './functions/content-enricher/resource';
import { aiProcessorFunction } from './functions/ai-processor/resource';
import { dataCleanupFunction } from './functions/data-cleanup/resource';
import { feedPreviewFunction } from './functions/feed-preview/resource';

const backend = defineBackend({
  auth,
  data,
  rssPollFunction,
  contentEnricherFunction,
  aiProcessorFunction,
  dataCleanupFunction,
  feedPreviewFunction,
});


// Grant RSS poll function access to DynamoDB tables
const rssPollLambda = backend.rssPollFunction.resources.lambda;

// Get table references from the data construct
const tables = backend.data.resources.tables;
const sourceTable = tables['Source'];
const userSourceSubscriptionTable = tables['UserSourceSubscription'];
const feedItemTable = tables['FeedItem'];
const storyGroupTable = tables['StoryGroup'];

// Enable TTL and Streams on FeedItem table
// Find the CfnTable in the construct tree
const cfnFeedItemTable = feedItemTable.node.findAll().find(
  (child) => child instanceof cdk.aws_dynamodb.CfnTable
) as cdk.aws_dynamodb.CfnTable | undefined;

if (cfnFeedItemTable) {
  // Enable TTL (auto-delete items after 2 weeks based on expiresAt)
  cfnFeedItemTable.addPropertyOverride('TimeToLiveSpecification', {
    AttributeName: 'expiresAt',
    Enabled: true,
  });

  // Enable DynamoDB Streams for cleanup triggers
  cfnFeedItemTable.addPropertyOverride('StreamSpecification', {
    StreamViewType: 'NEW_AND_OLD_IMAGES',
  });
}

// Grant read/write access to the tables
sourceTable.grantReadWriteData(rssPollLambda);
feedItemTable.grantReadWriteData(rssPollLambda);
storyGroupTable.grantReadWriteData(rssPollLambda);

// Add table names as environment variables using the cfnFunction
const cfnFunction = backend.rssPollFunction.resources.cfnResources.cfnFunction;
cfnFunction.addPropertyOverride('Environment.Variables.SOURCE_TABLE_NAME', sourceTable.tableName);
cfnFunction.addPropertyOverride('Environment.Variables.FEED_ITEM_TABLE_NAME', feedItemTable.tableName);
cfnFunction.addPropertyOverride('Environment.Variables.STORY_GROUP_TABLE_NAME', storyGroupTable.tableName);

// Grant AI processor function access to DynamoDB tables
const aiProcessorLambda = backend.aiProcessorFunction.resources.lambda;
feedItemTable.grantReadWriteData(aiProcessorLambda);
storyGroupTable.grantReadWriteData(aiProcessorLambda);

// Add table names as environment variables for AI processor
const aiProcessorCfnFunction = backend.aiProcessorFunction.resources.cfnResources.cfnFunction;
aiProcessorCfnFunction.addPropertyOverride('Environment.Variables.FEED_ITEM_TABLE_NAME', feedItemTable.tableName);
aiProcessorCfnFunction.addPropertyOverride('Environment.Variables.STORY_GROUP_TABLE_NAME', storyGroupTable.tableName);

// Schedule RSS poller to run every 15 minutes
const rssPollStack = backend.rssPollFunction.stack;
new Rule(rssPollStack, 'RssPollSchedule', {
  schedule: Schedule.rate(Duration.minutes(15)),
  targets: [new LambdaFunction(rssPollLambda)],
});

// === Content Enricher Function ===
const contentEnricherLambda = backend.contentEnricherFunction.resources.lambda;
feedItemTable.grantReadWriteData(contentEnricherLambda);

// Add table name as environment variable for content enricher
const contentEnricherCfnFunction = backend.contentEnricherFunction.resources.cfnResources.cfnFunction;
contentEnricherCfnFunction.addPropertyOverride('Environment.Variables.FEED_ITEM_TABLE_NAME', feedItemTable.tableName);

// Schedule content enricher to run every 3 minutes
const contentEnricherStack = backend.contentEnricherFunction.stack;
new Rule(contentEnricherStack, 'ContentEnricherSchedule', {
  schedule: Schedule.rate(Duration.minutes(3)),
  targets: [new LambdaFunction(contentEnricherLambda)],
});

// Schedule AI processor to run every 5 minutes
const aiProcessorStack = backend.aiProcessorFunction.stack;
new Rule(aiProcessorStack, 'AiProcessorSchedule', {
  schedule: Schedule.rate(Duration.minutes(5)),
  targets: [new LambdaFunction(aiProcessorLambda)],
});

// === Data Cleanup Function ===
const dataCleanupLambda = backend.dataCleanupFunction.resources.lambda;

// Grant read/write access to tables
feedItemTable.grantReadWriteData(dataCleanupLambda);
storyGroupTable.grantReadWriteData(dataCleanupLambda);

// Add table names as environment variables
const dataCleanupCfnFunction = backend.dataCleanupFunction.resources.cfnResources.cfnFunction;
dataCleanupCfnFunction.addPropertyOverride('Environment.Variables.FEED_ITEM_TABLE_NAME', feedItemTable.tableName);
dataCleanupCfnFunction.addPropertyOverride('Environment.Variables.STORY_GROUP_TABLE_NAME', storyGroupTable.tableName);

// Add DynamoDB Stream as event source (triggered when items are deleted by TTL)
dataCleanupLambda.addEventSource(
  new DynamoEventSource(feedItemTable, {
    startingPosition: StartingPosition.LATEST,
    batchSize: 100,
    retryAttempts: 3,
  })
);

// Schedule daily cleanup for orphaned story groups
const dataCleanupStack = backend.dataCleanupFunction.stack;
new Rule(dataCleanupStack, 'DataCleanupSchedule', {
  schedule: Schedule.rate(Duration.hours(24)),
  targets: [
    new LambdaFunction(dataCleanupLambda, {
      event: RuleTargetInput.fromObject({ action: 'full' }),
    }),
  ],
});

// === Feed Preview Function ===
// Create a function URL for the feed preview Lambda (allows direct HTTP calls from frontend)
const feedPreviewLambda = backend.feedPreviewFunction.resources.lambda;
const feedPreviewUrl = feedPreviewLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE, // Public endpoint for RSS fetching
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [cdk.aws_lambda.HttpMethod.POST],
    allowedHeaders: ['Content-Type'],
  },
});

// Add to amplify_outputs.json so frontend can access it
backend.addOutput({
  custom: {
    feedPreviewUrl: feedPreviewUrl.url,
  },
});

export { backend };
