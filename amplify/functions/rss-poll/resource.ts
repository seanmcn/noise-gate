import { defineFunction } from '@aws-amplify/backend';

export const rssPollFunction = defineFunction({
  name: 'rss-poll',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  environment: {
    // These will be overridden by backend.ts with actual table names
    FEED_ITEM_TABLE_NAME: '',
    STORY_GROUP_TABLE_NAME: '',
    OWNER_ID: 'default-owner',
  },
});
