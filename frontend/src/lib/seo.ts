/**
 * Centralized SEO configuration.
 * Values are read from environment variables with sensible defaults.
 */
export const SEO_CONFIG = {
  siteName: import.meta.env.VITE_SITE_NAME || 'MinFeed',
  tagline: import.meta.env.VITE_SITE_TAGLINE || 'Filter the noise, find the signal',
  defaultDescription:
    import.meta.env.VITE_SITE_DESCRIPTION ||
    'AI-powered RSS aggregator with sentiment analysis and smart categorization.',
  baseUrl: import.meta.env.VITE_SITE_URL || 'https://minfeed.com',
  twitterHandle: import.meta.env.VITE_TWITTER_HANDLE || '',
  defaultImage: '/og-image.png',
  locale: 'en_US',
};

/**
 * Per-route SEO configuration.
 * Routes not listed here will use defaults from SEO_CONFIG.
 */
export const ROUTE_SEO: Record<
  string,
  { title: string; description?: string; noIndex?: boolean }
> = {
  '/': {
    title: `${SEO_CONFIG.siteName} - ${SEO_CONFIG.tagline}`,
    description: SEO_CONFIG.defaultDescription,
  },
  '/auth': {
    title: 'Sign In',
    description: `Sign in to ${SEO_CONFIG.siteName} to personalize your news feed with custom sources and preferences.`,
  },
  '/settings': {
    title: 'Settings',
    description: `Customize your ${SEO_CONFIG.siteName} experience with blocked words, display preferences, and more.`,
    noIndex: true,
  },
  '/sources': {
    title: 'RSS Sources',
    description: 'Manage your RSS sources. Add custom feeds or toggle system sources.',
    noIndex: true,
  },
};

/**
 * Get the canonical URL for a given path.
 */
export function getCanonicalUrl(path: string): string {
  const base = SEO_CONFIG.baseUrl.replace(/\/$/, '');
  return `${base}${path}`;
}

/**
 * Get the full URL for an image path.
 */
export function getFullImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http')) return imagePath;
  const base = SEO_CONFIG.baseUrl.replace(/\/$/, '');
  return `${base}${imagePath}`;
}
