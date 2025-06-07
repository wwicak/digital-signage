import { useState, useEffect } from "react";
import { useGlobalDisplaySSE } from "./useGlobalDisplaySSE";

interface DisplayStatus {
  [displayId: string]: {
    isOnline: boolean;
    clientCount: number;
    lastSeen?: Date;
  };
}

/**
 * Hook to track display online/offline status and client connections
 */
export const useDisplayStatus = () => {
  const [displayStatus, setDisplayStatus] = useState<DisplayStatus>({});
  const { isConnected } = useGlobalDisplaySSE(true);

  // Simulate status updates for now - in a real implementation,
  // this would come from the SSE connection or periodic API calls
  useEffect(() => {
    const updateStatus = () => {
      // This is a placeholder implementation
      // In a real system, you would get this data from:
      // 1. SSE events for real-time updates
      // 2. Periodic API calls to check display status
      // 3. WebSocket connections from display clients

      setDisplayStatus((prevStatus) => {
        const newStatus = { ...prevStatus };

        // For demo purposes, mark displays as online if SSE is connected
        // In reality, this would be based on actual display client connections
        Object.keys(newStatus).forEach((displayId) => {
          newStatus[displayId] = {
            ...newStatus[displayId],
            isOnline: isConnected,
            lastSeen: new Date(),
          };
        });

        return newStatus;
      });
    };

    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    // Initial update
    updateStatus();

    return () => clearInterval(interval);
  }, [isConnected]);

  const getDisplayStatus = (displayId: string) => {
    return (
      displayStatus[displayId] || {
        isOnline: false,
        clientCount: 0,
        lastSeen: undefined,
      }
    );
  };

  const setDisplayOnline = (displayId: string, clientCount: number = 1) => {
    setDisplayStatus((prev) => ({
      ...prev,
      [displayId]: {
        isOnline: true,
        clientCount,
        lastSeen: new Date(),
      },
    }));
  };

  const setDisplayOffline = (displayId: string) => {
    setDisplayStatus((prev) => ({
      ...prev,
      [displayId]: {
        isOnline: false,
        clientCount: 0,
        lastSeen: prev[displayId]?.lastSeen || new Date(),
      },
    }));
  };

  return {
    displayStatus,
    getDisplayStatus,
    setDisplayOnline,
    setDisplayOffline,
    isSSEConnected: isConnected,
  };
};
