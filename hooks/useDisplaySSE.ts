import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IDisplayData } from "../actions/display";

/**
 * Hook for handling Server-Sent Events (SSE) real-time updates for displays.
 * This is a placeholder implementation that sets up the structure for SSE integration.
 *
 * Features (to be implemented):
 * - Real-time display updates via SSE
 * - Automatic cache invalidation on server events
 * - Graceful fallback when SSE is unavailable
 * - Connection management and error handling
 *
 * @param enabled - Whether to enable SSE listening (default: true)
 */
export const useDisplaySSE = (enabled: boolean = true) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    // TODO: Implement actual SSE connection when backend SSE endpoint is ready
    // This is a placeholder structure for future implementation

    /*
    const eventSource = new EventSource("/api/v1/display/events");

    eventSource.addEventListener("display_updated", (event) => {
      const { displayId, action, displayData } = JSON.parse(event.data);

      switch (action) {
        case "create":
          // Optimistically add new display to list
          queryClient.setQueryData(['displays'], (old: IDisplayData[] | undefined) => {
            if (!old) return [displayData]
            return [...old, displayData]
          })
          // Invalidate to ensure consistency
          queryClient.invalidateQueries({ queryKey: ["displays"] });
          break;
          
        case "update":
          // Update individual display cache
          queryClient.setQueryData(["display", displayId], displayData);
          
          // Update displays list cache
          queryClient.setQueryData(['displays'], (old: IDisplayData[] | undefined) => {
            if (!old) return [displayData]
            return old.map((display) =>
              display._id === displayId ? displayData : display
            )
          })
          break;
          
        case "delete":
          // Remove from displays list
          queryClient.setQueryData(['displays'], (old: IDisplayData[] | undefined) => {
            if (!old) return []
            return old.filter((display) => display._id !== displayId)
          })
          // Remove individual display cache
          queryClient.removeQueries({ queryKey: ["display", displayId] });
          break;
      }
    });

    eventSource.addEventListener("error", (event) => {
      console.error("SSE connection error:", event);
      // Implement reconnection logic here
    });

    return () => {
      eventSource.close();
    };
    */

    console.log(
      "SSE hook initialized (placeholder - actual implementation pending)"
    );

    // Cleanup function for when effect is removed
    return () => {
      console.log("SSE hook cleanup (placeholder)");
    };
  }, [enabled, queryClient]);

  // Return SSE connection status and control functions
  return {
    isConnected: false, // Placeholder - will be true when SSE is actually connected
    reconnect: () => {
      console.log("SSE reconnect requested (placeholder)");
    },
    disconnect: () => {
      console.log("SSE disconnect requested (placeholder)");
    },
  };
};

/**
 * Utility function to manually trigger display data refresh
 * Can be used as a fallback when SSE is not available
 */
export const refreshDisplayData = (queryClient: any, displayId?: string) => {
  if (displayId) {
    // Refresh specific display
    queryClient.invalidateQueries({ queryKey: ["display", displayId] });
  } else {
    // Refresh all displays
    queryClient.invalidateQueries({ queryKey: ["displays"] });
  }
};
