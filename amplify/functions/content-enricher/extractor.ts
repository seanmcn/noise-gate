import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';

const FETCH_TIMEOUT = parseInt(process.env.FETCH_TIMEOUT_MS || '10000', 10);
const MAX_CONTENT_LENGTH = 10000; // Store up to 10KB of text

// Keywords that suggest paywalled or login-required content
const PAYWALL_KEYWORDS = [
  'subscribe to continue',
  'sign in to continue',
  'create an account',
  'premium content',
  'members only',
  'subscription required',
  'register to read',
  'paywall',
];

export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/**
 * Fetch and extract article content from a URL.
 * Returns the extracted text content or throws an ExtractionError.
 */
export async function extractArticle(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'NoiseGate/1.0 (Article Enricher; https://github.com/noise-gate)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      // 4xx errors are not retryable (not found, forbidden, etc.)
      // 5xx errors are retryable (server issues)
      const isRetryable = response.status >= 500;
      throw new ExtractionError(
        `HTTP ${response.status}: ${response.statusText}`,
        isRetryable
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      throw new ExtractionError(`Unsupported content type: ${contentType}`, false);
    }

    const html = await response.text();

    // Parse with linkedom and extract with Readability
    const { document } = parseHTML(html);

    // Set the documentURI for Readability to resolve relative URLs
    Object.defineProperty(document, 'documentURI', { value: url });

    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new ExtractionError('No content extracted - page may not be an article', false);
    }

    // Clean and normalize the text
    const cleanedContent = cleanText(article.textContent);

    // Check for paywall indicators
    if (isPaywalled(cleanedContent)) {
      throw new ExtractionError('Content appears to be paywalled', false);
    }

    // Check minimum content length (very short content is likely not useful)
    if (cleanedContent.length < 100) {
      throw new ExtractionError('Extracted content too short', false);
    }

    // Truncate to max length
    return cleanedContent.slice(0, MAX_CONTENT_LENGTH);
  } catch (error) {
    if (error instanceof ExtractionError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ExtractionError('Request timed out', true);
      }
      throw new ExtractionError(error.message, true);
    }

    throw new ExtractionError('Unknown error during extraction', true);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Clean and normalize extracted text.
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Remove leading/trailing whitespace
    .trim();
}

/**
 * Check if content appears to be paywalled.
 */
function isPaywalled(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return PAYWALL_KEYWORDS.some((keyword) => lowerContent.includes(keyword));
}
