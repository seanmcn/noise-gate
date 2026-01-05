import { defineFunction } from '@aws-amplify/backend';

export const contentEnricherFunction = defineFunction({
  name: 'content-enricher',
  entry: './handler.ts',
  timeoutSeconds: 120,
  memoryMB: 256, // linkedom is lightweight
  environment: {
    FEED_ITEM_TABLE_NAME: '',
    OWNER_ID: 'default-owner',
    MAX_ITEMS_PER_RUN: '20',
    FETCH_TIMEOUT_MS: '10000',
  },
});
