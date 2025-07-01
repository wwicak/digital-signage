import { useState, useEffect, useCallback } from "react";
import { useGlobalDisplaySSE } from "./useGlobalDisplaySSE";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface DisplayStatusDetail {
  isOnline: boolean;
  clientCount: number;
  lastSeen?: Date;
  lastHeartbeat?: Date;
  consecutiveFailures: number;
  responseTime?: number;
  uptimePercentage?: number;
  connectionType?: "sse" | "websocket" | "polling";
  ipAddress?: string;
  disconnectionReason?: string;
  alertCount?: number;
  // Performance metrics
  performance?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    temperature?: number;
  };
  // Additional metadata
  metadata?: {
    resolution?: string;
    browser?: string;
    appVersion?: string;
    screenSize?: string;
    ipAddress?: string;
  };
}

interface DisplayStatus {
  [displayId: string]: DisplayStatusDetail;
}

interface MonitoringStats {
  displays: {
    total: number;
    online: number;
    offline: number;
    uptimePercentage: number;
  };
  alerts: {
    active: number;
  };
  heartbeats: {
    lastHour: number;
  };
  service: {
    isRunning: boolean;
  };
  lastUpdated: string;
}

/**
 * Enhanced hook to track display online/offline status with real-time monitoring
 */
export const useDisplayStatus = (options?: {
  enableRealTimeUpdates?: boolean;
  refreshInterval?: number;
  offlineThresholdMinutes?: number;
}) => {
  const {
    enableRealTimeUpdates = true,
    refreshInterval = process.env.NODE_ENV === "development" ? 120000 : 30000, // 2 minutes in dev, 30 seconds in prod
    offlineThresholdMinutes = 5,
  } = options || {};

  const [displayStatus, setDisplayStatus] = useState<DisplayStatus>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const { isConnected } = useGlobalDisplaySSE(enableRealTimeUpdates);
  const queryClient = useQueryClient();

  // Fetch monitoring stats
  const {
    data: monitoringStats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<MonitoringStats>({
    queryKey: ["monitoring-stats"],
    queryFn: async () => {
      const response = await fetch("/api/v1/monitoring/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch monitoring stats");
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: enableRealTimeUpdates ? refreshInterval : false,
    enabled: enableRealTimeUpdates,
    retry: (failureCount, error) => {
      // Don't retry on network errors
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("ERR_NETWORK")
      ) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch detailed status for all displays
  const fetchDisplayStatuses = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/monitoring/displays");
      if (!response.ok) {
        throw new Error("Failed to fetch display statuses");
      }
      const data = await response.json();

      const statusMap: DisplayStatus = {};
      data.displays?.forEach((display: {
        displayId: string;
        isOnline: boolean;
        clientCount?: number;
        lastSeen?: string;
        lastHeartbeat?: string;
        consecutiveFailures?: number;
        responseTime?: number;
        uptimePercentage?: number;
        connectionType?: "sse" | "websocket" | "polling";
        ipAddress?: string;
        disconnectionReason?: string;
        alertCount?: number;
        performance?: {
          cpuUsage?: number;
          memoryUsage?: number;
          diskUsage?: number;
          temperature?: number;
        };
        metadata?: {
          resolution?: string;
          browser?: string;
          appVersion?: string;
          screenSize?: string;
        };
      }) => {
        statusMap[display.displayId] = {
          isOnline: display.isOnline,
          clientCount: display.clientCount || 0,
          lastSeen: display.lastSeen ? new Date(display.lastSeen) : undefined,
          lastHeartbeat: display.lastHeartbeat
            ? new Date(display.lastHeartbeat)
            : undefined,
          consecutiveFailures: display.consecutiveFailures || 0,
          responseTime: display.responseTime,
          uptimePercentage: display.uptimePercentage,
          connectionType: display.connectionType,
          ipAddress: display.ipAddress,
          disconnectionReason: display.disconnectionReason,
          alertCount: display.alertCount || 0,
          performance: display.performance,
          metadata: display.metadata,
        };
      });

      setDisplayStatus(statusMap);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error("Error fetching display statuses:", error);
      // Don't retry on network errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        !errorMessage.includes("Failed to fetch") &&
        !errorMessage.includes("ERR_NETWORK")
      ) {
        // Only log non-network errors for debugging
        console.warn("Non-network error in fetchDisplayStatuses:", error);
      }
    }
  }, []);

  // Real-time status updates via SSE (handled by useGlobalDisplaySSE)
  // The SSE connection is managed by useGlobalDisplaySSE to prevent duplicate connections

  // Periodic status updates
  useEffect(() => {
    // Initial fetch
    fetchDisplayStatuses();

    // Set up periodic updates only if real-time updates are enabled
    if (enableRealTimeUpdates) {
      const interval = setInterval(fetchDisplayStatuses, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, enableRealTimeUpdates]); // Removed fetchDisplayStatuses from dependencies

  // Utility functions
  const getDisplayStatus = useCallback(
    (displayId: string): DisplayStatusDetail => {
      return (
        displayStatus[displayId] || {
          isOnline: false,
          clientCount: 0,
          lastSeen: undefined,
          lastHeartbeat: undefined,
          consecutiveFailures: 0,
          responseTime: undefined,
          uptimePercentage: undefined,
          connectionType: undefined,
          ipAddress: undefined,
          disconnectionReason: undefined,
          alertCount: 0,
          performance: undefined,
          metadata: undefined,
        }
      );
    },
    [displayStatus]
  );

  const isDisplayOnline = useCallback(
    (displayId: string): boolean => {
      const status = getDisplayStatus(displayId);
      if (!status.lastSeen) return false;

      const offlineThresholdMs = offlineThresholdMinutes * 60 * 1000;
      const timeSinceLastSeen = Date.now() - status.lastSeen.getTime();

      return status.isOnline && timeSinceLastSeen < offlineThresholdMs;
    },
    [getDisplayStatus, offlineThresholdMinutes]
  );

  const getOfflineDisplays = useCallback((): string[] => {
    return Object.keys(displayStatus).filter(
      (displayId) => !isDisplayOnline(displayId)
    );
  }, [displayStatus, isDisplayOnline]);

  const getOnlineDisplays = useCallback((): string[] => {
    return Object.keys(displayStatus).filter((displayId) =>
      isDisplayOnline(displayId)
    );
  }, [displayStatus, isDisplayOnline]);

  const getDisplaysWithAlerts = useCallback((): string[] => {
    return Object.keys(displayStatus).filter((displayId) => {
      const status = getDisplayStatus(displayId);
      return status.alertCount && status.alertCount > 0;
    });
  }, [displayStatus, getDisplayStatus]);

  const getTotalUptimePercentage = useCallback((): number => {
    const statuses = Object.values(displayStatus);
    if (statuses.length === 0) return 100;

    const totalUptime = statuses.reduce((sum, status) => {
      return sum + (status.uptimePercentage || 0);
    }, 0);

    return totalUptime / statuses.length;
  }, [displayStatus]);

  const sendHeartbeat = useCallback(
    async (displayId: string, clientInfo?: Record<string, unknown>): Promise<boolean> => {
      try {
        const response = await fetch(
          `/api/v1/displays/${displayId}/heartbeat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              clientInfo,
            }),
          }
        );

        if (response.ok) {
          // Update local status optimistically
          setDisplayStatus((prev) => ({
            ...prev,
            [displayId]: {
              ...prev[displayId],
              isOnline: true,
              lastSeen: new Date(),
              lastHeartbeat: new Date(),
              consecutiveFailures: 0,
            },
          }));
          return true;
        }

        return false;
      } catch (error) {
        console.error(
          `Error sending heartbeat for display ${displayId}:`,
          error
        );
        return false;
      }
    },
    []
  );

  const refreshStatus = useCallback(async (): Promise<void> => {
    await Promise.all([fetchDisplayStatuses(), refetchStats()]);
  }, [fetchDisplayStatuses, refetchStats]);

  // Manual status setters (for backward compatibility and testing)
  const setDisplayOnline = useCallback(
    (displayId: string, clientCount: number = 1) => {
      setDisplayStatus((prev) => ({
        ...prev,
        [displayId]: {
          ...prev[displayId],
          isOnline: true,
          clientCount,
          lastSeen: new Date(),
          lastHeartbeat: new Date(),
          consecutiveFailures: 0,
        },
      }));
    },
    []
  );

  const setDisplayOffline = useCallback(
    (displayId: string, reason?: string) => {
      setDisplayStatus((prev) => ({
        ...prev,
        [displayId]: {
          ...prev[displayId],
          isOnline: false,
          clientCount: 0,
          disconnectionReason: reason,
          consecutiveFailures: (prev[displayId]?.consecutiveFailures || 0) + 1,
        },
      }));
    },
    []
  );

  return {
    // Status data
    displayStatus,
    monitoringStats,
    lastUpdateTime,

    // Status queries
    getDisplayStatus,
    isDisplayOnline,
    getOfflineDisplays,
    getOnlineDisplays,
    getDisplaysWithAlerts,
    getTotalUptimePercentage,

    // Actions
    sendHeartbeat,
    refreshStatus,
    setDisplayOnline,
    setDisplayOffline,

    // Loading states
    isLoadingStats,
    statsError,

    // Connection status
    isSSEConnected: isConnected,
    isRealTimeEnabled: enableRealTimeUpdates,
  };
};
