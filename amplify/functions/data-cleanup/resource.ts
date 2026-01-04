import { defineFunction } from '@aws-amplify/backend';

export const dataCleanupFunction = defineFunction({
  name: 'data-cleanup',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for batch operations
  memoryMB: 256,
  environment: {
    // These will be overridden by backend.ts with actual table names
    FEED_ITEM_TABLE_NAME: '',
    STORY_GROUP_TABLE_NAME: '',
    OWNER_ID: 'default-owner',
  },
});
