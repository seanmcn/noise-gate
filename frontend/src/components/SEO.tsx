import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SEO_CONFIG, ROUTE_SEO, getCanonicalUrl, getFullImageUrl } from '@/lib/seo';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

/**
 * SEO component for managing page-level meta tags.
 * Reads route-specific config from ROUTE_SEO, with prop overrides.
 */
export function SEO({ title, description, image, noIndex }: SEOProps) {
  const location = useLocation();
  const path = location.pathname;

  // Get route-specific config or use defaults
  const routeConfig = ROUTE_SEO[path];

  const pageTitle = title ?? routeConfig?.title ?? SEO_CONFIG.siteName;
  const pageDescription = description ?? routeConfig?.description ?? SEO_CONFIG.defaultDescription;
  const pageImage = getFullImageUrl(image ?? SEO_CONFIG.defaultImage);
  const canonicalUrl = getCanonicalUrl(path);
  const shouldNoIndex = noIndex ?? routeConfig?.noIndex ?? false;

  // Use title template for non-home pages
  const formattedTitle =
    path === '/' ? pageTitle : `${pageTitle} | ${SEO_CONFIG.siteName}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{formattedTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Robots */}
      {shouldNoIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:site_name" content={SEO_CONFIG.siteName} />
      <meta property="og:locale" content={SEO_CONFIG.locale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      {SEO_CONFIG.twitterHandle && (
        <meta name="twitter:site" content={SEO_CONFIG.twitterHandle} />
      )}
    </Helmet>
  );
}
