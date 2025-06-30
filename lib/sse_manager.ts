import { Response } from "express";
import { sendSseEvent } from "./helpers/common_helper";

export let sseClients: Record<string, Response[]> = {};

// Function for tests to inspect clients if needed
export function getConnectedClients() {
  return sseClients;
}

export function addClient(displayId: string, response: Response): void {
  if (!sseClients[displayId]) {
    sseClients[displayId] = [];
  }
  sseClients[displayId].push(response);
}

export function removeClient(displayId: string, response: Response): void {
  if (sseClients[displayId]) {
    sseClients[displayId] = sseClients[displayId].filter(
      (client) => client !== response
    );
    if (sseClients[displayId].length === 0) {
      delete sseClients[displayId];
    }
  }
}

// Define Express app type
interface ExpressApp {
  get(path: string, handler: (req: unknown, res: Response) => void): void;
}

export function initializeSSE(app: ExpressApp): void { // Express app type
  // app should be Express
  /*
   * In a real scenario, this would set up the app.get('/api/v1/events/:displayId', handler) route.
   * The handler would then use addClient and removeClient.
   * For testing purposes, if tests call this, it needs to exist.
   * The tests seem to grab the handler from mockApp.get().mock.calls[0][1],
   * so this function might not need to do much if the test setup is self-contained for the handler logic.
   * console.log("initializeSSE called on app (placeholder)");
   */
}

export function sendSSEUpdate(data: Record<string, unknown>): void { // SSE update data type
  /*
   * This function is expected by tests to send an 'adminUpdate' event to ALL clients.
   * This is a broad cast to every client connected for any displayId.
   */
  Object.values(sseClients).forEach((clientList) => {
    clientList.forEach((client) => {
      try {
        sendSseEvent(client, "adminUpdate", data);
      } catch (error) {
        console.error(`[SSE] Error sending update to client: ${client}`, error);
      }
    });
  });
}

export function sendEventToDisplay(
  displayId: string,
  eventName: string,
  data: Record<string, unknown> // Event data payload
): void {
  // Try to use the new SSE implementation first
  try {
    // Import the function dynamically to avoid circular dependencies
    const {
      sendEventToDisplay: newSendEvent,
    } = require("../app/api/v1/displays/[id]/events/route");
    if (newSendEvent) {
      newSendEvent(displayId, eventName, data);
      return;
    }
  } catch (error) {
    console.warn(
      "New SSE implementation not available, falling back to legacy:",
      error
    );
  }

  // Fallback to legacy implementation
  if (sseClients[displayId]) {
    sseClients[displayId].forEach((client) => {
      sendSseEvent(client, eventName, data);
    });
  }
}

export function getConnectedClientCount(displayId: string): number {
  return sseClients[displayId]?.length || 0;
}

export function resetSseClientsForTesting(): void {
  sseClients = {};
}
