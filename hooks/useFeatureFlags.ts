import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { 
  IFeatureFlag, 
  FeatureFlagType, 
  FeatureFlagName 
} from "@/lib/models/FeatureFlag";

// Types for API responses
interface FeatureFlagCreateData {
  name: FeatureFlagName;
  displayName: string;
  description?: string;
  type: FeatureFlagType;
  enabled: boolean;
  allowedRoles: string[];
}

interface FeatureFlagUpdateData {
  displayName?: string;
  description?: string;
  enabled?: boolean;
  allowedRoles?: string[];
}

// API functions
const featureFlagApi = {
  getAll: async (params?: { type?: FeatureFlagType; enabled?: boolean }): Promise<IFeatureFlag[]> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append("type", params.type);
    if (params?.enabled !== undefined) searchParams.append("enabled", params.enabled.toString());
    
    const url = `/api/feature-flags${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await axios.get(url);
    return response.data;
  },

  getById: async (id: string): Promise<IFeatureFlag> => {
    const response = await axios.get(`/api/feature-flags/${id}`);
    return response.data;
  },

  create: async (data: FeatureFlagCreateData): Promise<IFeatureFlag> => {
    const response = await axios.post("/api/feature-flags", data);
    return response.data;
  },

  update: async (id: string, data: FeatureFlagUpdateData): Promise<IFeatureFlag> => {
    const response = await axios.put(`/api/feature-flags/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/feature-flags/${id}`);
  },
};

// Hook for fetching all feature flags
export function useFeatureFlags(params?: { type?: FeatureFlagType; enabled?: boolean }) {
  return useQuery({
    queryKey: ["feature-flags", params],
    queryFn: () => featureFlagApi.getAll(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for fetching a single feature flag
export function useFeatureFlag(id: string) {
  return useQuery({
    queryKey: ["feature-flags", id],
    queryFn: () => featureFlagApi.getById(id),
    enabled: !!id,
  });
}

// Hook for creating a feature flag
export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: featureFlagApi.create,
    onSuccess: () => {
      // Invalidate and refetch feature flags
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    },
  });
}

// Hook for updating a feature flag
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FeatureFlagUpdateData }) =>
      featureFlagApi.update(id, data),
    onSuccess: (updatedFlag) => {
      // Update the specific feature flag in cache
      queryClient.setQueryData(["feature-flags", updatedFlag._id], updatedFlag);
      // Invalidate the list to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    },
  });
}

// Hook for deleting a feature flag
export function useDeleteFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: featureFlagApi.delete,
    onSuccess: () => {
      // Invalidate and refetch feature flags
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    },
  });
}

// Hook for checking if a specific feature flag is enabled for the current user
export function useFeatureFlagAccess(flagName: FeatureFlagName) {
  const { data: featureFlags, isLoading } = useFeatureFlags({ enabled: true });
  
  const hasAccess = featureFlags?.some(flag => 
    flag.name === flagName && flag.enabled
  ) ?? false;

  return {
    hasAccess,
    isLoading,
  };
}

// Hook for getting feature flags by type
export function useFeatureFlagsByType(type: FeatureFlagType) {
  return useFeatureFlags({ type });
}

// Hook for getting enabled feature flags only
export function useEnabledFeatureFlags() {
  return useFeatureFlags({ enabled: true });
}
