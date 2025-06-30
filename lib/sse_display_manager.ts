/**
 * SSE Manager for Display Communication
 * Handles real-time communication with physical displays
 */

// Global SSE connections store
const sseConnections = new Map<string, Set<ReadableStreamDefaultController>>();

// Helper to add connection
export function addDisplayConnection(
  displayId: string,
  controller: ReadableStreamDefaultController
) {
  if (!sseConnections.has(displayId)) {
    sseConnections.set(displayId, new Set());
  }
  sseConnections.get(displayId)!.add(controller);
  console.log(
    `SSE connection added for display ${displayId}. Total connections: ${
      sseConnections.get(displayId)!.size
    }`
  );
}

// Helper to remove connection
export function removeDisplayConnection(
  displayId: string,
  controller: ReadableStreamDefaultController
) {
  const connections = sseConnections.get(displayId);
  if (connections) {
    connections.delete(controller);
    if (connections.size === 0) {
      sseConnections.delete(displayId);
      console.log(`All SSE connections removed for display ${displayId}`);
    } else {
      console.log(
        `SSE connection removed for display ${displayId}. Remaining connections: ${connections.size}`
      );
    }
  }
}

// Helper to send event to specific display
export function sendEventToDisplay(
  displayId: string,
  eventName: string,
  data: Record<string, unknown> // Event data payload
) {
  const connections = sseConnections.get(displayId);
  if (!connections || connections.size === 0) {
    console.log(`No SSE connections found for display ${displayId}`);
    return false;
  }

  const encoder = new TextEncoder();
  const eventData = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  const encodedData = encoder.encode(eventData);

  let successCount = 0;
  const failedConnections: ReadableStreamDefaultController[] = [];

  connections.forEach((controller) => {
    try {
      controller.enqueue(encodedData);
      successCount++;
    } catch (error) {
      console.error(`Failed to send SSE event to display ${displayId}:`, error);
      failedConnections.push(controller);
    }
  });

  // Remove failed connections
  failedConnections.forEach((controller) => {
    connections.delete(controller);
  });

  console.log(
    `SSE event '${eventName}' sent to display ${displayId}: ${successCount} successful, ${failedConnections.length} failed`
  );
  return successCount > 0;
}

// Helper to broadcast event to all displays
export function broadcastEventToAllDisplays(eventName: string, data: Record<string, unknown>) { // Broadcast event data
  let totalSent = 0;
  sseConnections.forEach((connections, displayId) => {
    if (sendEventToDisplay(displayId, eventName, data)) {
      totalSent++;
    }
  });
  console.log(`Broadcast event '${eventName}' sent to ${totalSent} displays`);
  return totalSent;
}

// Get connection status
export function getDisplayConnectionStatus(displayId: string) {
  const connections = sseConnections.get(displayId);
  return {
    displayId,
    isConnected: connections && connections.size > 0,
    connectionCount: connections ? connections.size : 0,
  };
}

// Get all connected displays
export function getAllConnectedDisplays() {
  const connectedDisplays: Array<{
    displayId: string;
    connectionCount: number;
  }> = [];
  sseConnections.forEach((connections, displayId) => {
    if (connections.size > 0) {
      connectedDisplays.push({
        displayId,
        connectionCount: connections.size,
      });
    }
  });
  return connectedDisplays;
}

// Cleanup function for testing
export function resetDisplayConnections() {
  sseConnections.clear();
  console.log("All SSE display connections cleared");
}
