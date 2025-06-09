import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

interface SystemStatus {
  database: {
    connected: boolean;
    responseTime?: number;
    error?: string;
  };
  server: {
    status: "online" | "offline";
    uptime?: number;
  };
  lastChecked: Date;
}

interface SystemStatusOptions {
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
}

/**
 * Hook to monitor system status including database connectivity
 */
export const useSystemStatus = (options?: SystemStatusOptions) => {
  const {
    refreshInterval = 30000, // 30 seconds
    enableRealTimeUpdates = true,
  } = options || {};

  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Fetch system status from API
  const {
    data: systemStatus,
    isLoading,
    error,
    refetch,
  } = useQuery<SystemStatus>({
    queryKey: ["system-status"],
    queryFn: async () => {
      const response = await fetch("/api/system/status");
      if (!response.ok) {
        throw new Error("Failed to fetch system status");
      }
      const data = await response.json();
      setLastUpdateTime(new Date());
      return data;
    },
    staleTime: refreshInterval / 2,
    refetchInterval: enableRealTimeUpdates ? refreshInterval : false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Manual refresh function
  const refreshStatus = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Failed to refresh system status:", error);
    }
  }, [refetch]);

  // Check if database is connected
  const isDatabaseConnected = systemStatus?.database?.connected ?? false;

  // Check overall system health
  const isSystemHealthy =
    isDatabaseConnected && systemStatus?.server?.status === "online";

  // Get status indicator color
  const getStatusColor = () => {
    if (isLoading) return "yellow";
    if (isDatabaseConnected && isSystemHealthy) return "green";
    return "red";
  };

  // Get status text
  const getStatusText = () => {
    if (isLoading) return "Checking...";
    if (isDatabaseConnected && isSystemHealthy) return "System Online";
    if (!isDatabaseConnected) return "Database Offline";
    return "System Issues";
  };

  // Get detailed status info
  const getStatusDetails = () => {
    if (!systemStatus) return null;

    return {
      database: {
        status: systemStatus.database.connected ? "Connected" : "Disconnected",
        responseTime: systemStatus.database.responseTime,
        error: systemStatus.database.error,
      },
      server: {
        status: systemStatus.server.status,
        uptime: systemStatus.server.uptime,
      },
      lastChecked: systemStatus.lastChecked,
    };
  };

  return {
    // Status data
    systemStatus,
    lastUpdateTime,

    // Status checks
    isDatabaseConnected,
    isSystemHealthy,

    // UI helpers
    getStatusColor,
    getStatusText,
    getStatusDetails,

    // Actions
    refreshStatus,

    // Loading states
    isLoading,
    error,
  };
};
