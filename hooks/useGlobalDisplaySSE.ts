import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook for handling global Server-Sent Events (SSE) for display client connections.
 * This hook listens for client connection/disconnection events across all displays
 * and updates the React Query cache accordingly.
 *
 * Features:
 * - Real-time client connection/disconnection updates
 * - Automatic cache invalidation on client events
 * - Graceful fallback when SSE is unavailable
 * - Connection management and error handling
 * - Updates clientCount and isOnline status for displays
 *
 * @param enabled - Whether to enable SSE listening (default: true)
 */
export const useGlobalDisplaySSE = (enabled: boolean = true) => {
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
    if (!enabled) return;

    try {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection for global display events
      const eventSource = new EventSource("/api/v1/displays/events");
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("connected", () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        console.log("Global display SSE connected");
      });

      // Listen for client connection events
      eventSource.addEventListener("client-connected", (event) => {
        const eventData = JSON.parse(event.data);
        const { displayId } = eventData;

        console.log(`Client connected to display ${displayId}`);

        // Invalidate queries to refetch fresh data with updated client count
        queryClient.invalidateQueries({ queryKey: ["displays"] });
        queryClient.invalidateQueries({ queryKey: ["display", displayId] });
      });

      // Listen for client disconnection events
      eventSource.addEventListener("client-disconnected", (event) => {
        const eventData = JSON.parse(event.data);
        const { displayId } = eventData;

        console.log(`Client disconnected from display ${displayId}`);

        // Invalidate queries to refetch fresh data with updated client count
        queryClient.invalidateQueries({ queryKey: ["displays"] });
        queryClient.invalidateQueries({ queryKey: ["display", displayId] });
      });

      // Listen for display status changes (online/offline)
      eventSource.addEventListener("display-status-changed", (event) => {
        const eventData = JSON.parse(event.data);
        const { displayId, isOnline } = eventData;

        console.log(
          `Display ${displayId} status changed: ${
            isOnline ? "online" : "offline"
          }`
        );

        // Invalidate queries to refetch fresh data with updated online status
        queryClient.invalidateQueries({ queryKey: ["displays"] });
        queryClient.invalidateQueries({ queryKey: ["display", displayId] });
      });

      // Listen for general display updates (fallback)
      eventSource.addEventListener("display-updated", (event) => {
        const eventData = JSON.parse(event.data);
        const { displayId, action } = eventData;

        console.log(`Display ${displayId} updated: ${action}`);

        switch (action) {
          case "create":
            queryClient.invalidateQueries({ queryKey: ["displays"] });
            queryClient.invalidateQueries({ queryKey: ["display", displayId] });
            break;

          case "update":
            queryClient.invalidateQueries({ queryKey: ["display", displayId] });
            queryClient.invalidateQueries({ queryKey: ["displays"] });
            break;

          case "delete":
            queryClient.removeQueries({ queryKey: ["display", displayId] });
            queryClient.invalidateQueries({ queryKey: ["displays"] });
            break;

          default:
            console.warn(`Unknown display action: ${action}`);
        }
      });

      eventSource.addEventListener("error", (event) => {
        console.error("Global display SSE connection error:", event);
        setIsConnected(false);

        // Don't reconnect immediately on network errors
        const target = event.target as EventSource;
        if (target && target.readyState === EventSource.CLOSED) {
          console.log("SSE connection closed, skipping reconnection");
          return;
        }

        // Implement exponential backoff reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay =
            reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Attempting to reconnect global display SSE (attempt ${reconnectAttemptsRef.current})`
            );
            connect();
          }, delay);
        } else {
          console.error(
            "Max reconnection attempts reached for global display SSE"
          );
        }
      });
    } catch (error) {
      console.error(
        "Failed to establish global display SSE connection:",
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
    if (!enabled) {
      disconnect();
      return;
    }

    connect();

    // Cleanup function
    return () => {
      disconnect();
    };
  }, [enabled, queryClient]);

  // Return SSE connection status and control functions
  return {
    isConnected,
    reconnect,
    disconnect,
  };
};
