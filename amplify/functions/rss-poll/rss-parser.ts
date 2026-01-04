export interface RSSItem {
  externalId: string;
  title: string;
  url: string;
  content: string;
  publishedAt: string;
}

/**
 * Fetch and parse an RSS feed.
 * Auto-detects Atom vs RSS format from the content.
 */
export async function fetchAndParseRSS(feedUrl: string): Promise<RSSItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'NoiseGate/1.0 (RSS Aggregator)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();

  // Auto-detect format: Atom feeds have <feed> root, RSS has <rss> or <channel>
  if (text.includes('<feed') && text.includes('<entry')) {
    return parseAtomFeed(text);
  }
  return parseStandardRSS(text);
}

/**
 * Parse Atom feed format.
 */
function parseAtomFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Match all <entry> elements
  const entryMatches = xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);

  for (const match of entryMatches) {
    const entry = match[1];

    const id = extractTag(entry, 'id') || '';
    const title = decodeHtmlEntities(extractTag(entry, 'title') || '');
    const link = extractAtomLink(entry);
    const content = decodeHtmlEntities(extractTag(entry, 'content') || extractTag(entry, 'summary') || '');
    const updated = extractTag(entry, 'updated') || extractTag(entry, 'published') || '';

    if (title && link) {
      items.push({
        externalId: id || link,
        title: cleanTitle(title),
        url: link,
        content: stripHtml(content).slice(0, 500),
        publishedAt: parseDate(updated),
      });
    }
  }

  return items;
}

/**
 * Parse standard RSS 2.0 feed format.
 */
function parseStandardRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Match all <item> elements
  const itemMatches = xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);

  for (const match of itemMatches) {
    const item = match[1];

    const guid = extractTag(item, 'guid') || '';
    const title = decodeHtmlEntities(extractTag(item, 'title') || '');
    const link = extractTag(item, 'link') || '';
    const description = decodeHtmlEntities(extractTag(item, 'description') || '');
    const pubDate = extractTag(item, 'pubDate') || '';

    if (title && link) {
      items.push({
        externalId: guid || link,
        title: cleanTitle(title),
        url: link,
        content: stripHtml(description).slice(0, 500),
        publishedAt: parseDate(pubDate),
      });
    }
  }

  return items;
}

/**
 * Extract content of an XML tag.
 */
function extractTag(xml: string, tagName: string): string | null {
  // Handle CDATA sections
  const cdataMatch = xml.match(
    new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i')
  );
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }

  // Handle regular content
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1].trim() : null;
}

/**
 * Extract link from Atom entry (handles <link href="..." /> format).
 */
function extractAtomLink(entry: string): string {
  // Try to get the alternate link first
  const alternateMatch = entry.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alternateMatch) {
    return alternateMatch[1];
  }

  // Fall back to any link with href
  const hrefMatch = entry.match(/<link[^>]*href=["']([^"']+)["']/i);
  if (hrefMatch) {
    return hrefMatch[1];
  }

  // Fall back to link content
  return extractTag(entry, 'link') || '';
}

/**
 * Decode HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  return result;
}

/**
 * Strip HTML tags from text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean up title (remove common prefixes, trim).
 */
function cleanTitle(title: string): string {
  return title
    .replace(/^\[.*?\]\s*/, '') // Remove [subreddit] prefix
    .replace(/^\/r\/\w+\s*[-–—]\s*/, '') // Remove r/subreddit prefix
    .trim();
}

/**
 * Parse date string to ISO format.
 */
function parseDate(dateStr: string): string {
  if (!dateStr) {
    return new Date().toISOString();
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}
