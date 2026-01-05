import type { Handler } from 'aws-lambda';
import { fetchAndParseRSS, type RSSItem } from './rss-parser';
import { normalizeTitle, findMatchingStoryGroup } from './dedup';
import {
  saveFeedItem,
  getExistingExternalIds,
  getRecentStoryGroups,
  updateStoryGroupCount,
  createStoryGroupInDb,
  getAllActiveSources,
  updateSourceSuccess,
  updateSourceError,
  type DbSource,
} from './db';

interface PollResult {
  sourcesProcessed: number;
  itemsFound: number;
  newItemsSaved: number;
  errors: string[];
}

export const handler: Handler = async (event): Promise<PollResult> => {
  console.log('RSS Poll triggered:', JSON.stringify(event));

  const results: PollResult = {
    sourcesProcessed: 0,
    itemsFound: 0,
    newItemsSaved: 0,
    errors: [],
  };

  // Get all active sources from database
  const sources = await getAllActiveSources();
  console.log(`Found ${sources.length} active sources to poll`);

  if (sources.length === 0) {
    console.log('No active sources configured');
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

  for (const source of sources) {
    try {
      console.log(`Processing source: ${source.name} (${source.url})`);

      // Fetch and parse RSS (auto-detects format)
      const items = await fetchAndParseRSS(source.url);
      results.itemsFound += items.length;
      console.log(`Found ${items.length} items in ${source.name}`);

      if (items.length === 0) {
        // Still a success - source responded but had no items
        await updateSourceSuccess(source.id);
        results.sourcesProcessed++;
        continue;
      }

      // Get existing external IDs to avoid duplicates
      const externalIds = items.map((item) => item.externalId);
      const existingIds = await getExistingExternalIds(source.id, externalIds);
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
            sourceId: source.id,
            sourceName: source.name,
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

      // Source processed successfully
      await updateSourceSuccess(source.id);
      results.sourcesProcessed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to process source ${source.name}:`, message);
      results.errors.push(`Source ${source.name}: ${message}`);

      // Track the error for this source
      await updateSourceError(source.id, message);
    }
  }

  console.log('RSS Poll completed:', results);
  return results;
};
