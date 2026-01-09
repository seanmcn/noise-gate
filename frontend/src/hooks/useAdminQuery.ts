import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataApi } from '@/lib/data-api';
import type { Source, AdminUserStats, Category, CustomList } from '@minfeed/shared';

/**
 * Hook to fetch system sources for admin management.
 */
export function useSystemSourcesQuery(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'systemSources'],
    enabled,
    queryFn: () => dataApi.listSystemSources(),
  });
}

/**
 * Hook to fetch user statistics for admin.
 */
export function useUserStatsQuery(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'userStats'],
    enabled,
    queryFn: async (): Promise<AdminUserStats[]> => {
      const [preferences, subscriptions] = await Promise.all([
        dataApi.listAllUserPreferences(),
        dataApi.listAllSubscriptions(),
      ]);

      // Group subscriptions by owner
      const subsByOwner = new Map<string, number>();
      for (const sub of subscriptions) {
        const owner = sub.owner as string;
        const type = sub.sourceType as string;
        if (owner && type === 'custom') {
          subsByOwner.set(owner, (subsByOwner.get(owner) || 0) + 1);
        }
      }

      // Map preferences to stats, deduplicating by owner
      const seenOwners = new Set<string>();
      const stats: AdminUserStats[] = [];

      for (const pref of preferences) {
        const owner = pref.owner as string;
        if (!owner || seenOwners.has(owner)) continue;
        seenOwners.add(owner);

        const ownerEmail = (pref.ownerEmail as string) || owner;
        const excludedCategories = parseJsonField<Category[]>(
          pref.excludedCategories,
          []
        );
        const customLists = parseJsonField<CustomList[]>(pref.customLists, []);

        stats.push({
          userId: pref.id as string,
          email: ownerEmail,
          customSourceCount: subsByOwner.get(owner) || 0,
          hiddenCategoryCount: excludedCategories.length,
          customListCount: customLists.length,
        });
      }

      return stats;
    },
  });
}

/**
 * Hook to create a system source.
 */
export function useCreateSystemSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ url, name, isDefault = true }: { url: string; name: string; isDefault?: boolean }) =>
      dataApi.createSystemSource(url, name, isDefault),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'systemSources'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Hook to update a system source.
 */
export function useUpdateSystemSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { url?: string; name?: string; isActive?: boolean; isPublic?: boolean; isDefault?: boolean };
    }) => dataApi.updateSystemSource(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'systemSources'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Hook to delete a system source and clean up associated articles.
 * Returns { itemsMarked: number } on success.
 */
export function useDeleteSystemSourceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dataApi.deleteSystemSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'systemSources'] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

// Helper to safely parse JSON fields from Amplify
function parseJsonField<T>(value: unknown, defaultValue: T): T {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}
