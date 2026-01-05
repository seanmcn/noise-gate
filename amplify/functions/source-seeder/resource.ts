import { defineFunction } from '@aws-amplify/backend';

export const sourceSeederFunction = defineFunction({
  name: 'source-seeder',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 128,
  environment: {
    // These will be overridden by backend.ts with actual table names
    SOURCE_TABLE_NAME: '',
  },
});
