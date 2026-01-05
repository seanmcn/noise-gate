import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Article } from '@minfeed/shared';
import { dataApi } from '@/lib/data-api';

/**
 * Query key for feed items - varies by authentication status.
 */
export const feedQueryKey = (isAuthenticated: boolean) =>
  ['feed', isAuthenticated ? 'authenticated' : 'public'] as const;

/**
 * Hook to fetch feed items with caching.
 * Returns cached data immediately, refetches in background when stale.
 */
export function useFeedQuery(isAuthenticated: boolean) {
  return useQuery({
    queryKey: feedQueryKey(isAuthenticated),
    queryFn: async (): Promise<Article[]> => {
      return isAuthenticated
        ? await dataApi.listFeedItems()
        : await dataApi.listPublicFeedItems();
    },
  });
}

/**
 * Hook to mark an article as seen.
 * Updates the cache optimistically for instant UI feedback.
 */
export function useMarkSeenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await dataApi.markItemSeen(id);
      return id;
    },
    onMutate: async (id: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: ['feed'] });

      // Optimistically update the cache
      queryClient.setQueriesData<Article[]>({ queryKey: ['feed'] }, (old) =>
        old?.map((article) =>
          article.id === id
            ? { ...article, seenAt: new Date().toISOString() }
            : article
        )
      );

      return { previousData };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
  });
}

/**
 * Hook to invalidate and refetch feed data.
 * Use after source changes or subscription updates.
 */
export function useInvalidateFeed() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  };
}
