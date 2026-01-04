import type { Handler, DynamoDBStreamEvent } from 'aws-lambda';
import {
  markFeedItemsForDeletion,
  deleteMarkedFeedItems,
  cleanupOrphanedStoryGroups,
  decrementStoryGroupCount,
} from './db';

interface CleanupResult {
  feedItemsMarked: number;
  feedItemsDeleted: number;
  storyGroupsDeleted: number;
  errors: string[];
}

interface CleanupEvent {
  action?: 'markForDeletion' | 'deleteMarked' | 'cleanupOrphans' | 'full';
  feedId?: string; // Required for markForDeletion
}

/**
 * Data cleanup Lambda handler.
 * Handles both scheduled cleanup and DynamoDB stream events.
 */
export const handler: Handler = async (event): Promise<CleanupResult> => {
  console.log('Data cleanup triggered:', JSON.stringify(event));

  // Check if this is a DynamoDB Stream event (from TTL deletions)
  if ('Records' in event && Array.isArray(event.Records)) {
    return handleStreamEvent(event as DynamoDBStreamEvent);
  }

  // Otherwise, handle scheduled/invoked cleanup
  return handleCleanupEvent(event as CleanupEvent);
};

/**
 * Handle scheduled or manually invoked cleanup.
 */
async function handleCleanupEvent(event: CleanupEvent): Promise<CleanupResult> {
  const results: CleanupResult = {
    feedItemsMarked: 0,
    feedItemsDeleted: 0,
    storyGroupsDeleted: 0,
    errors: [],
  };

  const action = event.action || 'full';

  try {
    // Mark items for deletion (called when feed is deleted)
    if (action === 'markForDeletion' && event.feedId) {
      results.feedItemsMarked = await markFeedItemsForDeletion(event.feedId);
      console.log(`Marked ${results.feedItemsMarked} items for deletion`);
    }

    // Delete marked items (scheduled task)
    if (action === 'deleteMarked' || action === 'full') {
      results.feedItemsDeleted = await deleteMarkedFeedItems();
      console.log(`Deleted ${results.feedItemsDeleted} marked items`);
    }

    // Cleanup orphaned story groups (scheduled task)
    if (action === 'cleanupOrphans' || action === 'full') {
      results.storyGroupsDeleted = await cleanupOrphanedStoryGroups();
      console.log(`Deleted ${results.storyGroupsDeleted} orphaned story groups`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cleanup failed:', message);
    results.errors.push(message);
  }

  console.log('Cleanup completed:', results);
  return results;
}

/**
 * Handle DynamoDB Stream events (triggered when items are deleted by TTL).
 */
async function handleStreamEvent(event: DynamoDBStreamEvent): Promise<CleanupResult> {
  const results: CleanupResult = {
    feedItemsMarked: 0,
    feedItemsDeleted: 0,
    storyGroupsDeleted: 0,
    errors: [],
  };

  // Collect story group decrements
  const storyGroupDecrements: Map<string, number> = new Map();

  for (const record of event.Records) {
    // Only process REMOVE events (deletions)
    if (record.eventName === 'REMOVE' && record.dynamodb?.OldImage) {
      const oldImage = record.dynamodb.OldImage;
      const storyGroupId = oldImage.storyGroupId?.S;

      if (storyGroupId) {
        const count = storyGroupDecrements.get(storyGroupId) || 0;
        storyGroupDecrements.set(storyGroupId, count + 1);
      }
    }
  }

  // Decrement story group counts
  for (const [storyGroupId, count] of storyGroupDecrements) {
    try {
      await decrementStoryGroupCount(storyGroupId, count);
      console.log(`Decremented story group ${storyGroupId} by ${count}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to decrement story group ${storyGroupId}:`, message);
      results.errors.push(message);
    }
  }

  console.log(`Processed ${event.Records.length} stream records`);
  return results;
}
