import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FeatureFlagName, IFeatureFlag } from "@/lib/types/feature-flags";

interface UseFeatureFlagAccessOptions {
  enabled?: boolean;
  staleTime?: number;
}

interface FeatureFlagAccessResult {
  hasAccess: boolean;
  isLoading: boolean;
  error: Error | null;
  featureFlag?: IFeatureFlag;
}

/**
 * Hook to check if the current user has access to a specific feature flag
 */
export const useFeatureFlagAccess = (
  flagName: FeatureFlagName,
  options: UseFeatureFlagAccessOptions = {}
): FeatureFlagAccessResult => {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  const {
    data: featureFlag,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["feature-flag-access", flagName],
    queryFn: async (): Promise<IFeatureFlag | null> => {
      const response = await fetch(`/api/v1/feature-flags/check/${flagName}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Feature flag doesn't exist, deny access
          return null;
        }
        throw new Error("Failed to check feature flag access");
      }
      const data = await response.json();
      return data.hasAccess ? data.featureFlag : null;
    },
    enabled,
    staleTime,
    retry: 1,
  });

  return {
    hasAccess: !!featureFlag?.enabled,
    isLoading,
    error: error as Error | null,
    featureFlag: featureFlag || undefined,
  };
};

/**
 * Hook to get all accessible feature flags for the current user
 */
export const useAccessibleFeatureFlags = (
  options: UseFeatureFlagAccessOptions = {}
) => {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ["accessible-feature-flags"],
    queryFn: async (): Promise<IFeatureFlag[]> => {
      const response = await fetch("/api/v1/feature-flags/accessible");
      if (!response.ok) {
        throw new Error("Failed to fetch accessible feature flags");
      }
      const data = await response.json();
      return data.featureFlags || [];
    },
    enabled,
    staleTime,
    retry: 1,
  });
};

/**
 * Hook to check multiple feature flags at once
 */
export const useMultipleFeatureFlagAccess = (
  flagNames: FeatureFlagName[],
  options: UseFeatureFlagAccessOptions = {}
) => {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;

  return useQuery({
    queryKey: ["multiple-feature-flag-access", flagNames],
    queryFn: async (): Promise<Record<FeatureFlagName, boolean>> => {
      const response = await fetch("/api/v1/feature-flags/check-multiple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flagNames }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to check multiple feature flags");
      }
      
      const data = await response.json();
      return data.access || {};
    },
    enabled: enabled && flagNames.length > 0,
    staleTime,
    retry: 1,
  });
};

/**
 * Utility function to check feature flag access synchronously (for use with cached data)
 */
export const checkFeatureFlagAccess = (
  flagName: FeatureFlagName,
  featureFlags: IFeatureFlag[]
): boolean => {
  const flag = featureFlags.find(f => f.name === flagName);
  return flag?.enabled || false;
};

/**
 * Hook for widget choices filtered by feature flags
 */
export const useWidgetChoices = () => {
  const { data: accessibleFlags, isLoading } = useAccessibleFeatureFlags();

  const widgetChoices = React.useMemo(() => {
    if (!accessibleFlags) return [];

    const widgetFlags = accessibleFlags.filter(flag => 
      flag.type === "widget" && flag.enabled
    );

    return widgetFlags.map(flag => ({
      name: flag.name,
      displayName: flag.displayName,
      description: flag.description,
      type: "widget" as const,
    }));
  }, [accessibleFlags]);

  return {
    widgetChoices,
    isLoading,
  };
};

/**
 * Hook for menu items filtered by feature flags
 */
export const useMenuItems = () => {
  const { data: accessibleFlags, isLoading } = useAccessibleFeatureFlags();

  const menuItems = React.useMemo(() => {
    if (!accessibleFlags) return [];

    const menuFlags = accessibleFlags.filter(flag => 
      flag.type === "menu_item" && flag.enabled
    );

    return menuFlags.map(flag => ({
      name: flag.name,
      displayName: flag.displayName,
      description: flag.description,
      type: "menu_item" as const,
    }));
  }, [accessibleFlags]);

  return {
    menuItems,
    isLoading,
  };
};

/**
 * Higher-order component for feature flag protection
 */
export const withFeatureFlag = <P extends object>(
  Component: React.ComponentType<P>,
  flagName: FeatureFlagName,
  fallback?: React.ComponentType<P> | null
) => {
  return (props: P) => {
    const { hasAccess, isLoading } = useFeatureFlagAccess(flagName);

    if (isLoading) {
      return null; // or a loading spinner
    }

    if (!hasAccess) {
      return fallback ? React.createElement(fallback, props) : null;
    }

    return React.createElement(Component, props);
  };
};


