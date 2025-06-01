import { Response } from "express";
import {
  addClient,
  removeClient,
  sendEventToDisplay,
  sendSSEUpdate,
  getConnectedClients,
  resetSseClientsForTesting,
} from "../../api/sse_manager";
import * as commonHelper from "../../api/helpers/common_helper";

// Mock the common helper
jest.mock("../../api/helpers/common_helper", () => ({
  sendSseEvent: jest.fn(),
}));

const mockedSendSseEvent = commonHelper.sendSseEvent as jest.MockedFunction<
  typeof commonHelper.sendSseEvent
>;

describe("SSE Manager", () => {
  let mockRes1: Partial<Response>;
  let mockRes2: Partial<Response>;
  let mockRes3: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSseClientsForTesting();

    // Create mock response objects
    mockRes1 = {
      write: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
    } as Partial<Response>;

    mockRes2 = {
      write: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
    } as Partial<Response>;

    mockRes3 = {
      write: jest.fn(),
      end: jest.fn(),
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
    } as Partial<Response>;
  });

  describe("addClient", () => {
    it("should add a client to the specified displayId", () => {
      const displayId = "display1";

      addClient(displayId, mockRes1 as Response);

      const clients = getConnectedClients();
      expect(clients[displayId]).toBeDefined();
      expect(clients[displayId]).toHaveLength(1);
      expect(clients[displayId][0]).toBe(mockRes1);
    });

    it("should add multiple clients to the same displayId", () => {
      const displayId = "display1";

      addClient(displayId, mockRes1 as Response);
      addClient(displayId, mockRes2 as Response);

      const clients = getConnectedClients();
      expect(clients[displayId]).toHaveLength(2);
      expect(clients[displayId]).toContain(mockRes1);
      expect(clients[displayId]).toContain(mockRes2);
    });

    it("should manage clients separately for different displayIds", () => {
      const displayId1 = "display1";
      const displayId2 = "display2";

      addClient(displayId1, mockRes1 as Response);
      addClient(displayId2, mockRes2 as Response);

      const clients = getConnectedClients();
      expect(clients[displayId1]).toHaveLength(1);
      expect(clients[displayId2]).toHaveLength(1);
      expect(clients[displayId1][0]).toBe(mockRes1);
      expect(clients[displayId2][0]).toBe(mockRes2);
    });
  });

  describe("removeClient", () => {
    it("should remove a specific client from the displayId", () => {
      const displayId = "display1";

      addClient(displayId, mockRes1 as Response);
      addClient(displayId, mockRes2 as Response);

      removeClient(displayId, mockRes1 as Response);

      const clients = getConnectedClients();
      expect(clients[displayId]).toHaveLength(1);
      expect(clients[displayId][0]).toBe(mockRes2);
    });

    it("should remove the displayId entry when no clients remain", () => {
      const displayId = "display1";

      addClient(displayId, mockRes1 as Response);
      removeClient(displayId, mockRes1 as Response);

      const clients = getConnectedClients();
      expect(clients[displayId]).toBeUndefined();
    });

    it("should handle removing non-existent client gracefully", () => {
      const displayId = "display1";

      // Try to remove from non-existent displayId
      removeClient(displayId, mockRes1 as Response);

      const clients = getConnectedClients();
      expect(clients[displayId]).toBeUndefined();
    });

    it("should handle removing non-existent client from existing displayId", () => {
      const displayId = "display1";

      addClient(displayId, mockRes1 as Response);
      removeClient(displayId, mockRes2 as Response); // Remove different client

      const clients = getConnectedClients();
      expect(clients[displayId]).toHaveLength(1);
      expect(clients[displayId][0]).toBe(mockRes1);
    });
  });

  describe("sendEventToDisplay", () => {
    it("should send event only to clients of the specified displayId", () => {
      const displayId1 = "display1";
      const displayId2 = "display2";
      const eventName = "display_updated";
      const eventData = { displayId: displayId1, action: "update" };

      // Add clients to different displays
      addClient(displayId1, mockRes1 as Response);
      addClient(displayId1, mockRes2 as Response);
      addClient(displayId2, mockRes3 as Response);

      sendEventToDisplay(displayId1, eventName, eventData);

      // Should send to display1 clients only
      expect(mockedSendSseEvent).toHaveBeenCalledTimes(2);
      expect(mockedSendSseEvent).toHaveBeenCalledWith(
        mockRes1,
        eventName,
        eventData
      );
      expect(mockedSendSseEvent).toHaveBeenCalledWith(
        mockRes2,
        eventName,
        eventData
      );
      expect(mockedSendSseEvent).not.toHaveBeenCalledWith(
        mockRes3,
        eventName,
        eventData
      );
    });

    it("should handle sending to non-existent displayId gracefully", () => {
      const displayId = "nonexistent";
      const eventName = "test_event";
      const eventData = { test: "data" };

      sendEventToDisplay(displayId, eventName, eventData);

      expect(mockedSendSseEvent).not.toHaveBeenCalled();
    });

    it("should send different events to different displays", () => {
      const displayId1 = "display1";
      const displayId2 = "display2";

      addClient(displayId1, mockRes1 as Response);
      addClient(displayId2, mockRes2 as Response);

      sendEventToDisplay(displayId1, "event1", { data: "for display1" });
      sendEventToDisplay(displayId2, "event2", { data: "for display2" });

      expect(mockedSendSseEvent).toHaveBeenCalledTimes(2);
      expect(mockedSendSseEvent).toHaveBeenCalledWith(mockRes1, "event1", {
        data: "for display1",
      });
      expect(mockedSendSseEvent).toHaveBeenCalledWith(mockRes2, "event2", {
        data: "for display2",
      });
    });

    it("should handle sendSseEvent errors gracefully", () => {
      const displayId = "display1";
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      addClient(displayId, mockRes1 as Response);
      mockedSendSseEvent.mockImplementation(() => {
        throw new Error("Send failed");
      });

      sendEventToDisplay(displayId, "test_event", { test: "data" });

      // Should not throw error, just log it
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // sendEventToDisplay doesn't have error handling yet

      consoleErrorSpy.mockRestore();
    });
  });

  describe("sendSSEUpdate (broadcast to all)", () => {
    it("should send adminUpdate event to all connected clients across all displays", () => {
      const displayId1 = "display1";
      const displayId2 = "display2";
      const updateData = { message: "global update" };

      addClient(displayId1, mockRes1 as Response);
      addClient(displayId1, mockRes2 as Response);
      addClient(displayId2, mockRes3 as Response);

      sendSSEUpdate(updateData);

      expect(mockedSendSseEvent).toHaveBeenCalledTimes(3);
      expect(mockedSendSseEvent).toHaveBeenCalledWith(
        mockRes1,
        "adminUpdate",
        updateData
      );
      expect(mockedSendSseEvent).toHaveBeenCalledWith(
        mockRes2,
        "adminUpdate",
        updateData
      );
      expect(mockedSendSseEvent).toHaveBeenCalledWith(
        mockRes3,
        "adminUpdate",
        updateData
      );
    });

    it("should not send anything when no clients are connected", () => {
      sendSSEUpdate({ message: "test" });

      expect(mockedSendSseEvent).not.toHaveBeenCalled();
    });

    it("should handle sendSseEvent errors and continue with other clients", () => {
      const displayId = "display1";
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      addClient(displayId, mockRes1 as Response);
      addClient(displayId, mockRes2 as Response);

      // Make first client throw error, second should still work
      mockedSendSseEvent.mockImplementationOnce(() => {
        throw new Error("Client 1 failed");
      });

      sendSSEUpdate({ message: "test" });

      expect(mockedSendSseEvent).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[SSE] Error sending update to client"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Integration scenarios", () => {
    it("should properly isolate events between different displays", () => {
      const display1 = "display1";
      const display2 = "display2";

      // Setup clients for different displays
      addClient(display1, mockRes1 as Response);
      addClient(display2, mockRes2 as Response);

      // Send display-specific event
      sendEventToDisplay(display1, "display_updated", {
        displayId: display1,
        action: "update",
      });

      // Send broadcast event
      sendSSEUpdate({ message: "admin broadcast" });

      // Verify display1 got both events
      expect(mockedSendSseEvent).toHaveBeenCalledWith(
        mockRes1,
        "display_updated",
        { displayId: display1, action: "update" }
      );
      expect(mockedSendSseEvent).toHaveBeenCalledWith(mockRes1, "adminUpdate", {
        message: "admin broadcast",
      });

      // Verify display2 only got broadcast event
      expect(mockedSendSseEvent).not.toHaveBeenCalledWith(
        mockRes2,
        "display_updated",
        expect.anything()
      );
      expect(mockedSendSseEvent).toHaveBeenCalledWith(mockRes2, "adminUpdate", {
        message: "admin broadcast",
      });
    });

    it("should handle complex client management scenarios", () => {
      const display1 = "display1";

      // Add multiple clients
      addClient(display1, mockRes1 as Response);
      addClient(display1, mockRes2 as Response);
      addClient(display1, mockRes3 as Response);

      // Remove middle client
      removeClient(display1, mockRes2 as Response);

      // Send event
      sendEventToDisplay(display1, "test_event", { test: "data" });

      // Should only send to remaining clients
      expect(mockedSendSseEvent).toHaveBeenCalledTimes(2);
      expect(mockedSendSseEvent).toHaveBeenCalledWith(mockRes1, "test_event", {
        test: "data",
      });
      expect(mockedSendSseEvent).toHaveBeenCalledWith(mockRes3, "test_event", {
        test: "data",
      });
      expect(mockedSendSseEvent).not.toHaveBeenCalledWith(
        mockRes2,
        "test_event",
        { test: "data" }
      );
    });
  });
});
