import { useQuery } from "@tanstack/react-query";
import { getLayout, ILayoutData } from "../actions/layouts";

/**
 * Hook for fetching a single layout by ID.
 * This hook provides reactive access to individual layout data.
 *
 * Features:
 * - Automatic caching with TanStack Query
 * - Optimized refetch behavior
 * - Error handling
 * - Loading states
 * - Includes display information for the layout
 *
 * @param id - Layout ID to fetch
 * @returns Query result with layout data, loading state, and error handling
 */
export const useLayout = (id: string | null) => {
  return useQuery<ILayoutData, Error>({
    queryKey: ["layout", id],
    queryFn: () => getLayout(id!),
    enabled: !!id, // Only run query if id is provided
    staleTime: 5 * 60 * 1000, // 5 minutes - layout data doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: true, // Enable refetch on reconnect for reliability
    retry: 2, // Retry failed requests twice
    refetchInterval: false, // Disable polling - layouts are relatively static
  });
};
