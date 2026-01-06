import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Article, Source, UserSourceSubscription } from '@minfeed/shared';
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

// ============ Sources Queries ============

export interface SourcesData {
  sources: Source[];
  subscriptions: UserSourceSubscription[];
  customSourceLimit: number;
}

/**
 * Hook to fetch sources and subscriptions with caching.
 * Auto-subscribes authenticated users to any missing system sources.
 * Only runs when enabled (for authenticated users).
 */
export function useSourcesQuery(enabled = true) {
  return useQuery({
    queryKey: ['sources'],
    enabled,
    queryFn: async (): Promise<SourcesData> => {
      const [sources, subscriptions, prefs] = await Promise.all([
        dataApi.listSources(),
        dataApi.listSubscriptions(),
        dataApi.getPreferences(),
      ]);

      // Auto-subscribe to missing default system sources
      const systemSources = sources.filter((s) => s.type === 'system');
      const subscribedSourceIds = new Set(subscriptions.map((s) => s.sourceId));
      const missingSystemSources = systemSources.filter(
        (s) => s.isDefault && !subscribedSourceIds.has(s.id)
      );

      let finalSubscriptions = subscriptions;
      if (missingSystemSources.length > 0) {
        const newSubscriptions = await Promise.all(
          missingSystemSources.map(async (source) => {
            try {
              return await dataApi.createSubscription(source);
            } catch (err) {
              console.error(`Failed to subscribe to ${source.name}:`, err);
              return null;
            }
          })
        );
        finalSubscriptions = [
          ...subscriptions,
          ...newSubscriptions.filter((s): s is UserSourceSubscription => s !== null),
        ];
      }

      return {
        sources,
        subscriptions: finalSubscriptions,
        customSourceLimit: prefs.customSourceLimit,
      };
    },
  });
}

/**
 * Hook to toggle a source's enabled status.
 */
export function useToggleSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      newEnabled,
    }: {
      subscriptionId: string;
      sourceId: string;
      newEnabled: boolean;
    }) => {
      await dataApi.updateSubscription(subscriptionId, newEnabled);
    },
    onMutate: async ({ sourceId, newEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ['sources'] });

      const previousData = queryClient.getQueryData<SourcesData>(['sources']);

      queryClient.setQueryData<SourcesData>(['sources'], (old) =>
        old
          ? {
              ...old,
              subscriptions: old.subscriptions.map((s) =>
                s.sourceId === sourceId ? { ...s, isEnabled: newEnabled } : s
              ),
            }
          : old
      );

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['sources'], context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidate feed since enabled sources changed
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Hook to add a custom source.
 */
export function useAddCustomSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      return await dataApi.addCustomSource(url, name);
    },
    onSuccess: ({ source, subscription }) => {
      queryClient.setQueryData<SourcesData>(['sources'], (old) => {
        if (!old) return old;
        const sourceExists = old.sources.some((s) => s.id === source.id);
        return {
          ...old,
          sources: sourceExists ? old.sources : [...old.sources, source],
          subscriptions: [...old.subscriptions, subscription],
        };
      });
    },
  });
}

/**
 * Hook to remove a custom source.
 */
export function useRemoveCustomSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      sourceId,
    }: {
      subscriptionId: string;
      sourceId: string;
    }) => {
      await dataApi.removeCustomSource(subscriptionId, sourceId);
      return { subscriptionId };
    },
    onSuccess: ({ subscriptionId }) => {
      queryClient.setQueryData<SourcesData>(['sources'], (old) =>
        old
          ? {
              ...old,
              subscriptions: old.subscriptions.filter((s) => s.id !== subscriptionId),
            }
          : old
      );
    },
  });
}
