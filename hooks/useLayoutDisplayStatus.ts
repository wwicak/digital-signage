import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDisplayStatus } from "./useDisplayStatus";

interface DisplayWithLayout {
  _id: string;
  name: string;
  layout: string;
  isOnline: boolean;
  lastSeen?: Date;
  lastHeartbeat?: Date;
  ipAddress?: string;
  responseTime?: number;
  uptimePercentage?: number;
  clientCount: number;
  location?: string;
  building?: string;
  connectionType?: "sse" | "websocket" | "polling";
}

interface UseLayoutDisplayStatusOptions {
  layoutId?: string;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

/**
 * Enhanced hook to track display status filtered by layout assignment
 */
export const useLayoutDisplayStatus = (
  options?: UseLayoutDisplayStatusOptions
) => {
  const {
    layoutId,
    refreshInterval = 30000,
    enableRealTimeUpdates = true,
  } = options || {};

  const [displaysWithLayout, setDisplaysWithLayout] = useState<
    DisplayWithLayout[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the base display status hook for real-time updates
  const {
    displayStatus,
    refreshStatus: baseRefreshStatus,
    isLoadingStats,
    statsError,
  } = useDisplayStatus({
    enableRealTimeUpdates,
    refreshInterval,
  });

  // Fetch displays with their layout assignments
  const {
    data: allDisplays,
    isLoading: isLoadingDisplays,
    error: displaysError,
    refetch: refetchDisplays,
  } = useQuery({
    queryKey: ["displays-with-layouts", layoutId],
    queryFn: async () => {
      const url = layoutId
        ? `/api/displays?layoutId=${layoutId}&includeOffline=true`
        : "/api/displays?includeOffline=true";

      const response = await fetch(url);
      if (!response.ok) {
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          throw new Error("Authentication required. Please log in again.");
        } else if (response.status === 403) {
          throw new Error(
            "Access denied. You don't have permission to view displays."
          );
        } else if (response.status === 404) {
          throw new Error("Display service not found.");
        } else if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        } else {
          throw new Error(`Failed to fetch displays (${response.status})`);
        }
      }
      return response.json();
    },
    staleTime: 60000, // 1 minute
    refetchInterval: enableRealTimeUpdates ? refreshInterval : false,
    retry: (failureCount, error) => {
      // Don't retry on network errors or client errors
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("ERR_NETWORK") ||
        error.message.includes("Authentication required") ||
        error.message.includes("Access denied")
      ) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch heartbeat data for displays
  const fetchDisplayHeartbeats = useCallback(async (displayIds: string[]) => {
    if (displayIds.length === 0) return {};

    try {
      const heartbeatPromises = displayIds.map(async (displayId) => {
        try {
          const response = await fetch(
            `/api/v1/displays/${displayId}/heartbeat`
          );
          if (response.ok) {
            const data = await response.json();
            return { displayId, heartbeatData: data };
          }
          return { displayId, heartbeatData: null };
        } catch (error) {
          console.warn(
            `Failed to fetch heartbeat for display ${displayId}:`,
            error
          );
          return { displayId, heartbeatData: null };
        }
      });

      const results = await Promise.all(heartbeatPromises);
      const heartbeatMap: Record<string, {
        isOnline?: boolean;
        lastHeartbeat?: string;
        recentHeartbeats?: Array<{
          ipAddress?: string;
          responseTime?: number;
          connectionType?: "sse" | "websocket" | "polling";
        }>;
        stats?: Array<{ count: number }>;
      } | null> = {};

      results.forEach(({ displayId, heartbeatData }) => {
        heartbeatMap[displayId] = heartbeatData;
      });

      return heartbeatMap;
    } catch (error) {
      console.error("Error fetching display heartbeats:", error);
      return {};
    }
  }, []);

  // Combine display data with status and heartbeat information
  useEffect(() => {
    const updateDisplaysWithStatus = async () => {
      if (!allDisplays?.displays) {
        setDisplaysWithLayout([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const displayIds = allDisplays.displays.map((d: { _id: string }) => d._id);
        const heartbeatData = await fetchDisplayHeartbeats(displayIds);

        const enhancedDisplays: DisplayWithLayout[] = allDisplays.displays.map(
          (display: {
            _id: string;
            name?: string;
            layout?: string;
            location?: string;
            building?: string;
          }) => {
            const statusDetail = displayStatus[display._id];
            const heartbeat = heartbeatData[display._id];

            // Determine if display is online based on recent heartbeat
            const lastHeartbeatTime = heartbeat?.lastHeartbeat
              ? new Date(heartbeat.lastHeartbeat)
              : statusDetail?.lastHeartbeat;

            const isOnline =
              heartbeat?.isOnline ??
              statusDetail?.isOnline ??
              (lastHeartbeatTime &&
                Date.now() - lastHeartbeatTime.getTime() < 2 * 60 * 1000) ??
              false;

            // Extract IP address from heartbeat data
            const ipAddress =
              heartbeat?.recentHeartbeats?.[0]?.ipAddress ??
              statusDetail?.ipAddress ??
              "Unknown";

            // Calculate uptime percentage
            const uptimePercentage =
              heartbeat?.stats?.length > 0
                ? heartbeat.stats.reduce(
                    (acc: number, stat: { count: number }) =>
                      acc + (stat.count > 0 ? 100 : 0),
                    0
                  ) / heartbeat.stats.length
                : statusDetail?.uptimePercentage ?? 0;

            return {
              _id: display._id,
              name: display.name || `Display ${display._id.slice(-4)}`,
              layout: display.layout || "default",
              isOnline,
              lastSeen: statusDetail?.lastSeen ?? lastHeartbeatTime,
              lastHeartbeat: lastHeartbeatTime,
              ipAddress,
              responseTime:
                heartbeat?.recentHeartbeats?.[0]?.responseTime ??
                statusDetail?.responseTime,
              uptimePercentage,
              clientCount: statusDetail?.clientCount ?? (isOnline ? 1 : 0),
              location: display.location || "Unknown Location",
              building: display.building || "Main Building",
              connectionType:
                heartbeat?.recentHeartbeats?.[0]?.connectionType ??
                statusDetail?.connectionType ??
                "sse",
            };
          }
        );

        setDisplaysWithLayout(enhancedDisplays);
      } catch (err) {
        // Provide more user-friendly error messages
        let errorMessage = "Failed to update display status";

        if (
          err.message.includes("Failed to fetch") ||
          err.message.includes("ERR_NETWORK")
        ) {
          errorMessage =
            "Network connection error. Please check your internet connection.";
        } else if (err.message.includes("404")) {
          errorMessage = "Display service not found. Please contact support.";
        } else if (err.message.includes("500")) {
          errorMessage = "Server error. Please try again later.";
        } else if (err.message.includes("401") || err.message.includes("403")) {
          errorMessage = "Authentication error. Please log in again.";
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    updateDisplaysWithStatus();
  }, [allDisplays, displayStatus]); // Removed fetchDisplayHeartbeats from dependencies

  // Filter displays by layout if layoutId is provided
  const filteredDisplays = useMemo(() => {
    if (!layoutId) return displaysWithLayout;
    return displaysWithLayout.filter((display) => display.layout === layoutId);
  }, [displaysWithLayout, layoutId]);

  // Utility functions
  const getOnlineDisplays = useCallback(() => {
    return filteredDisplays.filter((display) => display.isOnline);
  }, [filteredDisplays]);

  const getOfflineDisplays = useCallback(() => {
    return filteredDisplays.filter((display) => !display.isOnline);
  }, [filteredDisplays]);

  const getDisplaysByLayout = useCallback(() => {
    const grouped: Record<string, DisplayWithLayout[]> = {};
    displaysWithLayout.forEach((display) => {
      if (!grouped[display.layout]) {
        grouped[display.layout] = [];
      }
      grouped[display.layout].push(display);
    });
    return grouped;
  }, [displaysWithLayout]);

  const getDisplayStatus = useCallback(
    (displayId: string) => {
      return filteredDisplays.find((display) => display._id === displayId);
    },
    [filteredDisplays]
  );

  const refreshStatus = useCallback(async () => {
    await Promise.all([baseRefreshStatus(), refetchDisplays()]);
  }, [baseRefreshStatus, refetchDisplays]);

  // Calculate summary statistics
  const onlineCount = getOnlineDisplays().length;
  const offlineCount = getOfflineDisplays().length;
  const totalCount = filteredDisplays.length;
  const uptimePercentage =
    totalCount > 0 ? (onlineCount / totalCount) * 100 : 100;

  return {
    // Display data
    displays: filteredDisplays,
    allDisplays: displaysWithLayout,
    displaysByLayout: getDisplaysByLayout(),

    // Status queries
    getOnlineDisplays,
    getOfflineDisplays,
    getDisplayStatus,

    // Summary stats
    onlineCount,
    offlineCount,
    totalCount,
    uptimePercentage,

    // Actions
    refreshStatus,

    // Loading states
    isLoading: isLoading || isLoadingDisplays,
    isLoadingStats,
    error: error || displaysError?.message || statsError?.message,

    // Options
    layoutId,
  };
};
