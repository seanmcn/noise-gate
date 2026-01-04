export interface StoryGroup {
  id: string;
  canonicalTitle: string;
  canonicalUrl: string | null;
  itemCount: number;
  firstSeenAt: string;
}

// Common stop words to remove for title matching
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
  'their', 'he', 'she', 'him', 'her', 'his', 'hers', 'we', 'us', 'our',
  'you', 'your', 'i', 'me', 'my', 'what', 'which', 'who', 'whom',
  'how', 'why', 'when', 'where', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
]);

// Similarity threshold for matching stories (0-1)
const SIMILARITY_THRESHOLD = 0.6;

/**
 * Normalize a title for deduplication matching.
 * - Lowercase
 * - Remove punctuation
 * - Remove stop words
 * - Limit length
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .join(' ')
    .trim()
    .slice(0, 100);
}

/**
 * Calculate Jaccard similarity between two normalized titles.
 * Returns a value between 0 and 1.
 */
export function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter((w) => w.length > 2));
  const wordsB = new Set(b.split(' ').filter((w) => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) {
    return 0;
  }

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Find a matching story group for a normalized title.
 * Returns the best match above the similarity threshold, or null.
 */
export function findMatchingStoryGroup(
  normalizedTitle: string,
  storyGroups: StoryGroup[]
): StoryGroup | null {
  let bestMatch: StoryGroup | null = null;
  let bestScore = 0;

  for (const group of storyGroups) {
    const score = calculateSimilarity(normalizedTitle, group.canonicalTitle);
    if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
      bestMatch = group;
      bestScore = score;
    }
  }

  return bestMatch;
}
