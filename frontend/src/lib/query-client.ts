import { QueryClient } from '@tanstack/react-query';

/**
 * React Query client with caching configuration optimized for MinFeed.
 *
 * Backend updates articles every 15 minutes, so a 5-minute stale time
 * provides a good balance between freshness and reducing API calls.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Keep unused data in cache for 30 minutes
      gcTime: 30 * 60 * 1000,

      // Refetch when window regains focus (user returns to tab)
      refetchOnWindowFocus: true,

      // Don't refetch on component remount if data is fresh
      refetchOnMount: false,

      // Retry failed requests once
      retry: 1,
    },
  },
});
