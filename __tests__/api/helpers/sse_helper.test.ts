import * as http from 'http';
import { Express } from 'express'; // Assuming Express types are installed

// Import the functions to be tested and reset module state for sendSSEUpdate's connectedClients array
// Changed to import from sse_manager and common_helper
import * as sseManager from '../../../api/sse_manager'; // Using import for TS modules
import { sendSseEvent } from '../../../api/helpers/common_helper'; // Actual function for sending

interface MockRequest extends http.IncomingMessage {
  on: jest.Mock;
}

interface MockResponse extends http.ServerResponse {
  setHeader: jest.Mock;
  flushHeaders: jest.Mock;
  write: jest.Mock;
  end: jest.Mock;
  status?: jest.Mock; // Optional, for Express-like responses
  json?: jest.Mock; // Optional, for Express-like responses
}


describe('sse_helper', () => {
  let mockApp: Partial<Express>; // Use Partial<Express> for mocks
  let mockReq: MockRequest;
  let mockRes: MockResponse;

  beforeEach(() => {
    // Reset modules to clear connectedClients array in sse_helper for each test
    jest.resetModules(); // This will also reset sseManager's internal state if it's structured to allow it.
    // sseManager functions will be used directly, no need to re-require like this for TS modules.
    // Individual functions from sseManager will be spied on or used directly.

    // Clear any previous mock state from sseManager's internal sseClients object
    sseManager.sseClients = {};


    mockApp = {
      get: jest.fn(), // This will be used to simulate route setup if we decide to test it
    };
    mockReq = {
      on: jest.fn(),
      // http.IncomingMessage properties (add more as needed for type safety)
      headers: {},
      method: 'GET',
      url: '/',
      socket: {} as any, // Simplified for mock
    } as MockRequest;
    mockRes = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      // http.ServerResponse properties (add more as needed for type safety)
      statusCode: 200,
      statusMessage: 'OK',
      writableEnded: false,
    } as unknown as MockResponse; // Cast to unknown first for complex mock
  });

  // describe('initializeSSE', () => { // This functionality is not in sse_manager.ts
    // it('should set up the /api/v1/events GET route', () => {
    //   sseManager.initializeSSE(mockApp as Express); // initializeSSE doesn't exist in sseManager
    //   expect(mockApp.get).toHaveBeenCalledWith('/api/v1/events', expect.any(Function));
    // });

    // it('should set correct SSE headers and send initial event when a client connects', () => {
      // This test would need a mock Express app and a route that uses sseManager.addClient
      // For now, we'll focus on testing the manager's direct functions.
      // Example of direct client addition:
      // sseManager.addClient("display1", mockRes as any);
      // expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      // expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      // expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      // expect(mockRes.flushHeaders).toHaveBeenCalled();
      // expect(mockRes.write).toHaveBeenCalledWith('event: connected\ndata: {"message":"SSE connection established"}\n\n');
      // expect(sseManager.getConnectedClientsCount()).toBe(1); // getConnectedClientsCount doesn't exist
    // });

    // it('should remove a client when their connection closes', () => {
      // This also depends on route handler logic not present in sse_manager.ts
      // sseManager.initializeSSE(mockApp as Express);
      // const routeHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
      // routeHandler(mockReq, mockRes);

      // expect(sseManager.getConnectedClientsCount()).toBe(1); // getConnectedClientsCount doesn't exist

      // expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
      // const closeCallback = mockReq.on.mock.calls[0][1];
      // closeCallback();

      // expect(sseManager.getConnectedClientsCount()).toBe(0); // getConnectedClientsCount doesn't exist
      // expect(mockRes.end).toHaveBeenCalled();
    // });
  // });

  describe('sendEventToDisplay (formerly sendSSEUpdate)', () => {
    const displayId = "testDisplay";

    it('should not send updates if no clients are connected for the displayId', () => {
      sseManager.sendEventToDisplay(displayId, "testEvent", { message: 'test' });
      // No clients added, so no writes should occur. Individual client mocks are not globally available here.
      // This test implicitly checks that no error is thrown and no writes are attempted.
      // To be more explicit, one might spy on console.error or ensure client lists are empty.
      expect(sseManager.sseClients[displayId]).toBeUndefined();
    });

    it('should send updates to all connected clients for a specific displayId', () => {
      const mockResClient1 = { write: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn(), end: jest.fn() } as unknown as MockResponse;
      const mockResClient2 = { write: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn(), end: jest.fn() } as unknown as MockResponse;
      const otherDisplayClient = { write: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn(), end: jest.fn() } as unknown as MockResponse;
      
      // Add clients to the manager directly
      sseManager.addClient(displayId, mockResClient1 as any);
      sseManager.addClient(displayId, mockResClient2 as any);
      sseManager.addClient("otherDisplay", otherDisplayClient as any);


      const testData = { message: 'live update' };
      const eventName = "customAdminEvent";
      sseManager.sendEventToDisplay(displayId, eventName, testData);

      const expectedSSEFormattedData = `event: ${eventName}\ndata: ${JSON.stringify(testData)}\n\n`;
      expect(mockResClient1.write).toHaveBeenCalledWith(expectedSSEFormattedData);
      expect(mockResClient2.write).toHaveBeenCalledWith(expectedSSEFormattedData);
      expect(otherDisplayClient.write).not.toHaveBeenCalled(); // Client for other displayId should not receive it
    });

    it('should log an error if writing to a client fails (using sendSseEvent directly for simplicity)', () => {
      const mockBadClientRes = {
        write: jest.fn().mockImplementation(() => { 
          throw new Error('Client write failed'); 
        }),
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        end: jest.fn()
      } as unknown as MockResponse;
      
      // Test sendSseEvent directly as it's the one handling the write and error logging
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      sendSseEvent(mockBadClientRes as any, "testEvent", { message: 'data for bad client' });
      
      expect(mockBadClientRes.write).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to write SSE event:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
