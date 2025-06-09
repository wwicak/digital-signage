import { useQuery } from "@tanstack/react-query";
import {
  getLayouts,
  ILayoutQueryParams,
  ILayoutsResponse,
} from "../actions/layouts";

/**
 * Hook for fetching and caching layouts with filtering and pagination.
 * This hook provides reactive access to layouts across all components.
 *
 * Features:
 * - Automatic caching with TanStack Query
 * - Filtering by orientation, active status, template status
 * - Pagination support
 * - Search functionality
 * - Real-time updates when layouts change
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Query result with layouts data, loading state, and error handling
 */
export const useLayouts = (params: ILayoutQueryParams = {}) => {
  return useQuery<ILayoutsResponse, Error>({
    queryKey: ["layouts", params],
    queryFn: () => getLayouts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection time
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: true, // Enable refetch on reconnect for reliability
    retry: 2, // Retry failed requests twice
    refetchInterval: false, // Disable polling - layouts don't change frequently
    refetchOnMount: "always", // Always refetch when component mounts
  });
};

/**
 * Hook for fetching active layout templates (for display selector)
 */
export const useActiveLayoutTemplates = () => {
  return useLayouts({
    isActive: true,
    isTemplate: true,
    limit: 100, // Get all active templates
  });
};

/**
 * Hook for fetching user's own layouts
 */
export const useMyLayouts = (userId?: string) => {
  return useLayouts({
    creator_id: userId,
    limit: 50,
  });
};

/**
 * Hook for searching layouts
 */
export const useSearchLayouts = (
  searchTerm: string,
  filters: Omit<ILayoutQueryParams, "search"> = {}
) => {
  return useLayouts({
    search: searchTerm,
    ...filters,
  });
};
