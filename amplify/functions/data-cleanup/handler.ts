import type { Handler, DynamoDBStreamEvent } from 'aws-lambda';
import {
  markFeedItemsForDeletion,
  deleteMarkedFeedItems,
  cleanupOrphanedStoryGroups,
  decrementStoryGroupCount,
  deleteSource,
} from './db';

interface CleanupResult {
  feedItemsMarked: number;
  feedItemsDeleted: number;
  storyGroupsDeleted: number;
  errors: string[];
}

interface CleanupEvent {
  action?: 'markForDeletion' | 'deleteMarked' | 'cleanupOrphans' | 'full';
  feedId?: string; // Required for markForDeletion (legacy)
  sourceId?: string; // Required for markForDeletion
}

// Result for the deleteSourceWithCleanup mutation
interface DeleteSourceResult {
  success: boolean;
  itemsMarked: number;
  error?: string;
}

// AppSync mutation event shape
interface AppSyncMutationEvent {
  arguments: {
    sourceId: string;
  };
  typeName?: string;
  fieldName?: string;
}

/**
 * Data cleanup Lambda handler.
 * Handles AppSync mutations, scheduled cleanup, and DynamoDB stream events.
 */
export const handler: Handler = async (event): Promise<CleanupResult | DeleteSourceResult> => {
  console.log('Data cleanup triggered:', JSON.stringify(event));

  // Check if this is an AppSync mutation event (deleteSourceWithCleanup)
  if ('arguments' in event && event.arguments?.sourceId) {
    return handleDeleteSourceMutation(event as AppSyncMutationEvent);
  }

  // Check if this is a DynamoDB Stream event (from TTL deletions)
  if ('Records' in event && Array.isArray(event.Records)) {
    return handleStreamEvent(event as DynamoDBStreamEvent);
  }

  // Otherwise, handle scheduled/invoked cleanup
  return handleCleanupEvent(event as CleanupEvent);
};

/**
 * Handle the deleteSourceWithCleanup AppSync mutation.
 * Marks associated articles for deletion and then deletes the source.
 */
async function handleDeleteSourceMutation(event: AppSyncMutationEvent): Promise<DeleteSourceResult> {
  const { sourceId } = event.arguments;
  console.log(`Deleting source ${sourceId} with cleanup`);

  try {
    // First, mark all associated feed items for deletion
    const itemsMarked = await markFeedItemsForDeletion(sourceId);
    console.log(`Marked ${itemsMarked} items for deletion`);

    // Then delete the source record
    await deleteSource(sourceId);
    console.log(`Deleted source ${sourceId}`);

    return {
      success: true,
      itemsMarked,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to delete source ${sourceId}:`, message);
    return {
      success: false,
      itemsMarked: 0,
      error: message,
    };
  }
}

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
  // Support both sourceId and legacy feedId
  const sourceId = event.sourceId || event.feedId;

  try {
    // Mark items for deletion (called when source/feed is deleted)
    if (action === 'markForDeletion' && sourceId) {
      results.feedItemsMarked = await markFeedItemsForDeletion(sourceId);
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
