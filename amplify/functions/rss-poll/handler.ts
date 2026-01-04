import type { Handler } from 'aws-lambda';
import { fetchAndParseRSS, type RSSItem } from './rss-parser';
import { normalizeTitle, findMatchingStoryGroup } from './dedup';
import {
  saveFeedItem,
  getExistingExternalIds,
  getRecentStoryGroups,
  updateStoryGroupCount,
  createStoryGroupInDb,
  getAllActiveFeeds,
  type DbFeed,
} from './db';

interface PollResult {
  feedsProcessed: number;
  itemsFound: number;
  newItemsSaved: number;
  errors: string[];
}

export const handler: Handler = async (event): Promise<PollResult> => {
  console.log('RSS Poll triggered:', JSON.stringify(event));

  const results: PollResult = {
    feedsProcessed: 0,
    itemsFound: 0,
    newItemsSaved: 0,
    errors: [],
  };

  // Get all active feeds from database
  const feeds = await getAllActiveFeeds();
  console.log(`Found ${feeds.length} active feeds to poll`);

  if (feeds.length === 0) {
    console.log('No active feeds configured');
    return results;
  }

  // Get recent story groups for deduplication (last 7 days)
  let recentStoryGroups: Awaited<ReturnType<typeof getRecentStoryGroups>> = [];
  try {
    recentStoryGroups = await getRecentStoryGroups(7);
    console.log(`Found ${recentStoryGroups.length} recent story groups for dedup`);
  } catch (error) {
    console.error('Failed to fetch story groups:', error);
  }

  for (const feed of feeds) {
    try {
      console.log(`Processing feed: ${feed.name} (${feed.url})`);

      // Fetch and parse RSS (auto-detects format)
      const items = await fetchAndParseRSS(feed.url);
      results.itemsFound += items.length;
      console.log(`Found ${items.length} items in ${feed.name}`);

      if (items.length === 0) {
        results.feedsProcessed++;
        continue;
      }

      // Get existing external IDs to avoid duplicates
      const externalIds = items.map((item) => item.externalId);
      const existingIds = await getExistingExternalIds(feed.id, externalIds);
      console.log(`${existingIds.size} items already exist`);

      // Process new items
      for (const item of items) {
        if (existingIds.has(item.externalId)) {
          continue;
        }

        try {
          // Normalize title for dedup
          const titleNormalized = normalizeTitle(item.title);

          // Find or create story group
          let storyGroupId: string;
          const matchingGroup = findMatchingStoryGroup(titleNormalized, recentStoryGroups);

          if (matchingGroup) {
            storyGroupId = matchingGroup.id;
            await updateStoryGroupCount(matchingGroup.id, matchingGroup.itemCount + 1);
            matchingGroup.itemCount++; // Update local copy
          } else {
            const newGroup = await createStoryGroupInDb(titleNormalized, item);
            storyGroupId = newGroup.id;
            recentStoryGroups.push(newGroup); // Add to local list for subsequent items
          }

          // Save feed item
          await saveFeedItem({
            feedId: feed.id,
            feedName: feed.name,
            externalId: item.externalId,
            title: item.title,
            url: item.url,
            content: item.content,
            publishedAt: item.publishedAt,
            storyGroupId,
            titleNormalized,
          });

          results.newItemsSaved++;
        } catch (error) {
          console.error(`Failed to save item: ${item.title}`, error);
          results.errors.push(`Failed to save: ${item.title}`);
        }
      }

      results.feedsProcessed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to process feed ${feed.name}:`, message);
      results.errors.push(`Feed ${feed.name}: ${message}`);
    }
  }

  console.log('RSS Poll completed:', results);
  return results;
};
