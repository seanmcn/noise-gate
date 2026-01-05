import type { Handler } from 'aws-lambda';
import {
  getUnenrichedItems,
  updateItemEnrichment,
  type FeedItemForEnrichment,
  type EnrichmentStatus,
} from './db';
import { extractArticle, ExtractionError } from './extractor';

const MAX_ITEMS_PER_RUN = parseInt(process.env.MAX_ITEMS_PER_RUN || '20', 10);
const DELAY_BETWEEN_REQUESTS_MS = 500; // Rate limiting delay

interface EnrichmentResult {
  itemsProcessed: number;
  itemsEnriched: number;
  itemsSkipped: number;
  itemsFailed: number;
  errors: string[];
}

/**
 * Group items by domain to enable per-domain rate limiting.
 */
function groupByDomain(
  items: FeedItemForEnrichment[]
): Map<string, FeedItemForEnrichment[]> {
  const groups = new Map<string, FeedItemForEnrichment[]>();

  for (const item of items) {
    try {
      const domain = new URL(item.url).hostname;
      const existing = groups.get(domain) || [];
      existing.push(item);
      groups.set(domain, existing);
    } catch {
      // Invalid URL, put in unknown group
      const existing = groups.get('unknown') || [];
      existing.push(item);
      groups.set('unknown', existing);
    }
  }

  return groups;
}

/**
 * Delay helper for rate limiting.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const handler: Handler = async (event): Promise<EnrichmentResult> => {
  console.log('Content Enricher triggered:', JSON.stringify(event));

  const results: EnrichmentResult = {
    itemsProcessed: 0,
    itemsEnriched: 0,
    itemsSkipped: 0,
    itemsFailed: 0,
    errors: [],
  };

  try {
    // Get items that need enrichment
    const items = await getUnenrichedItems(MAX_ITEMS_PER_RUN);
    console.log(`Found ${items.length} items to enrich`);

    if (items.length === 0) {
      console.log('No items to enrich');
      return results;
    }

    // Group by domain for rate limiting
    const byDomain = groupByDomain(items);
    console.log(`Processing items from ${byDomain.size} domains`);

    // Process each domain group
    for (const [domain, domainItems] of byDomain) {
      console.log(`Processing ${domainItems.length} items from ${domain}`);

      for (let i = 0; i < domainItems.length; i++) {
        const item = domainItems[i];
        results.itemsProcessed++;

        try {
          console.log(`Enriching: ${item.title.slice(0, 50)}...`);
          const content = await extractArticle(item.url);

          await updateItemEnrichment(item.id, content, 'completed');
          results.itemsEnriched++;
          console.log(`Success: extracted ${content.length} chars`);
        } catch (error) {
          let status: EnrichmentStatus;
          let errorMessage: string;

          if (error instanceof ExtractionError) {
            status = error.isRetryable ? 'failed' : 'skipped';
            errorMessage = error.message;
          } else if (error instanceof Error) {
            status = 'failed';
            errorMessage = error.message;
          } else {
            status = 'failed';
            errorMessage = 'Unknown error';
          }

          await updateItemEnrichment(item.id, null, status, errorMessage);

          if (status === 'skipped') {
            results.itemsSkipped++;
            console.log(`Skipped: ${errorMessage}`);
          } else {
            results.itemsFailed++;
            results.errors.push(`${item.id}: ${errorMessage}`);
            console.log(`Failed: ${errorMessage}`);
          }
        }

        // Rate limit: delay between requests to the same domain
        if (i < domainItems.length - 1) {
          await delay(DELAY_BETWEEN_REQUESTS_MS);
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Content Enricher failed:', message);
    results.errors.push(message);
  }

  console.log('Content Enricher completed:', results);
  return results;
};
