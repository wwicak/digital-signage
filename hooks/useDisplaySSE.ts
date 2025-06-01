import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { IDisplayData } from "../actions/display";

/**
 * Hook for handling Server-Sent Events (SSE) real-time updates for specific displays.
 * Only subscribes to events for the specified displayId, implementing the feature
 * "Only broadcast changes to the edited display".
 *
 * Features:
 * - Real-time display updates via SSE for specific displayId
 * - Automatic cache invalidation on server events
 * - Graceful fallback when SSE is unavailable
 * - Connection management and error handling
 * - Display-specific subscriptions to prevent unnecessary updates
 *
 * @param displayId - The specific display ID to subscribe to (required for targeted updates)
 * @param enabled - Whether to enable SSE listening (default: true)
 */
export const useDisplaySSE = (displayId?: string, enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000; // Start with 1 second

  const connect = () => {
    if (!displayId || !enabled) return;

    try {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection for specific display
      const eventSource = new EventSource(
        `/api/v1/displays/${displayId}/events`
      );
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        console.log(`SSE connected to display ${displayId}`);
      });

      eventSource.addEventListener("display_updated", (event) => {
        const eventData = JSON.parse(event.data);
        const { displayId: eventDisplayId, action } = eventData;

        // Important: Only process events for the displayId we're subscribed to
        // This is the core of the "Only broadcast changes to the edited display" feature
        if (eventDisplayId !== displayId) {
          console.warn(
            `Received event for wrong display: expected ${displayId}, got ${eventDisplayId}`
          );
          return;
        }

        switch (action) {
          case "create":
            // For create events, invalidate displays list to fetch fresh data
            queryClient.invalidateQueries({ queryKey: ["displays"] });
            // Also invalidate the specific display cache
            queryClient.invalidateQueries({ queryKey: ["display", displayId] });
            break;

          case "update":
            // For update events, invalidate both individual display and displays list
            queryClient.invalidateQueries({ queryKey: ["display", displayId] });
            queryClient.invalidateQueries({ queryKey: ["displays"] });
            break;

          case "delete":
            // For delete events, remove from cache and invalidate displays list
            queryClient.removeQueries({ queryKey: ["display", displayId] });
            queryClient.invalidateQueries({ queryKey: ["displays"] });
            break;

          default:
            console.warn(`Unknown display action: ${action}`);
        }
      });

      eventSource.addEventListener("error", (event) => {
        console.error(`SSE connection error for display ${displayId}:`, event);
        setIsConnected(false);

        // Implement exponential backoff reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay =
            reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Attempting to reconnect SSE for display ${displayId} (attempt ${reconnectAttemptsRef.current})`
            );
            connect();
          }, delay);
        } else {
          console.error(
            `Max reconnection attempts reached for display ${displayId}`
          );
        }
      });
    } catch (error) {
      console.error(
        `Failed to establish SSE connection for display ${displayId}:`,
        error
      );
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  };

  const reconnect = () => {
    disconnect();
    connect();
  };

  useEffect(() => {
    if (!enabled || !displayId) {
      disconnect();
      return;
    }

    connect();

    // Cleanup function
    return () => {
      disconnect();
    };
  }, [enabled, displayId, queryClient]);

  // Return SSE connection status and control functions
  return {
    isConnected,
    reconnect,
    disconnect,
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
