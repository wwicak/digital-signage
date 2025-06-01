import { useQuery } from '@tanstack/react-query'
import { getDisplays } from '../actions/display'

/**
 * Global hook for fetching and caching the list of all displays.
 * This hook provides reactive access to the display list across all components.
 *
 * Features:
 * - Automatic caching with TanStack Query
 * - Optimized refetch behavior for digital signage use case
 * - Real-time updates via SSE integration (to be implemented)
 * - Background updates and error handling
 *
 * @returns Query result with displays data, loading state, and error handling
 */
export const useDisplays = () => {
  return useQuery({
    queryKey: ['displays'],
    queryFn: () => getDisplays(),
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
    refetchOnWindowFocus: false, // Disable refetch on window focus for digital signage
    refetchOnReconnect: true, // Enable refetch on reconnect for reliability
    retry: 2, // Retry failed requests twice
    refetchInterval: false, // Disable polling - we'll use SSE for real-time updates
    // Enable background refetching when the query becomes stale
    refetchOnMount: 'always', // Always refetch when component mounts
  })
}
