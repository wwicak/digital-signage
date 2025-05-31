import * as http from 'http';
import { Express, Response } from 'express'; // Import Response from express
// Using Jest globals: describe, it, expect, beforeEach, jest (for spyOn, resetModules)

// Import the functions to be tested
import * as sseManager from '../../api/sse_manager'; // Try different relative path

// To allow re-importing for fresh state with ES modules, we'll use dynamic import in beforeEach
// const sseManagerPath = '../../../api/sse_manager'; // No longer needed

// describe.skip temporarily to focus on user.test.ts
// interface MockRequest extends http.IncomingMessage {
interface MockRequest extends http.IncomingMessage {
  on: jest.Mock;
}

// No longer need custom MockResponse interface, will use Partial<Response> and casting

describe('sse_manager', () => { // Removed .skip
  let mockApp: Partial<Express>; // Use Partial<Express> for mocks
  let mockReq: MockRequest;
  let mockRes: Response; // Use express.Response type
  // No need for 'let sseManager: typeof sseManagerModule;' as we'll use the imported one.

  beforeEach(() => { // No longer async
    // Reset modules to clear connectedClients array in sse_manager for each test
    // jest.resetModules(); // Replaced with direct state reset
    sseManager.resetSseClientsForTesting(); // Use the exported reset function

    mockApp = { // mockApp is used minimally now
      get: jest.fn(),
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
      // Ensure all methods called by sseManager are mocked
      on: jest.fn(), // http.ServerResponse has 'on', express.Response extends it.
    } as unknown as Response; // Cast to unknown then to Response
  });

  // initializeSSE is now a placeholder in the source. Tests for addClient/removeClient cover the core state logic.
  // The original tests for initializeSSE were more about the behavior of a hypothetical route handler.
  describe('addClient and removeClient', () => {
    const displayId = 'testDisplay';

    it('should add a client to a displayId', () => {
      sseManager.addClient(displayId, mockRes);
      const clients = sseManager.getConnectedClients(); // Returns the sseClients object
      expect(clients[displayId]).toBeDefined();
      expect(clients[displayId]).toContain(mockRes);
      expect(clients[displayId].length).toBe(1);
    });

    it('should add multiple clients to the same displayId', () => {
      const mockRes2 = { ...mockRes, id: 'client2' } as unknown as Response; // Cast to Response
      sseManager.addClient(displayId, mockRes);
      sseManager.addClient(displayId, mockRes2);
      const clients = sseManager.getConnectedClients();
      expect(clients[displayId].length).toBe(2);
    });

    it('should remove a client from a displayId', () => {
      sseManager.addClient(displayId, mockRes);
      expect(sseManager.getConnectedClients()[displayId].length).toBe(1);
      sseManager.removeClient(displayId, mockRes);
      expect(sseManager.getConnectedClients()[displayId]).toBeUndefined();
    });

    it('should remove only the specified client', () => {
      const mockRes2 = { ...mockRes, id: 'client2' } as unknown as Response; // Cast to Response
      sseManager.addClient(displayId, mockRes);
      sseManager.addClient(displayId, mockRes2);
      sseManager.removeClient(displayId, mockRes);
      const clients = sseManager.getConnectedClients();
      expect(clients[displayId].length).toBe(1);
      expect(clients[displayId]).toContain(mockRes2);
    });

    it('should delete displayId from sseClients if last client is removed', () => {
      sseManager.addClient(displayId, mockRes);
      sseManager.removeClient(displayId, mockRes);
      expect(sseManager.getConnectedClients()[displayId]).toBeUndefined();
    });
  });

  describe('sendSSEUpdate', () => {
    it('should not send updates if no clients are connected', () => {
      sseManager.sendSSEUpdate({ message: 'test' });
      expect(mockRes.write).not.toHaveBeenCalled();
    });

    it('should send updates to all connected clients across all displayIds', () => {
      const mockResClient1 = { ...mockRes, id: 'client1', write: jest.fn() } as unknown as Response; // Cast to Response
      const mockResClient2 = { ...mockRes, id: 'client2', write: jest.fn() } as unknown as Response; // Cast to Response
      const mockResClient3 = { ...mockRes, id: 'client3', write: jest.fn() } as unknown as Response; // Cast to Response
      
      sseManager.addClient('display1', mockResClient1);
      sseManager.addClient('display1', mockResClient2);
      sseManager.addClient('display2', mockResClient3);
      
      const clients = sseManager.getConnectedClients();
      expect(Object.keys(clients).length).toBe(2);
      expect(clients['display1'].length).toBe(2);
      expect(clients['display2'].length).toBe(1);

      const testData = { message: 'live update' };
      sseManager.sendSSEUpdate(testData);

      const eventLine = `event: adminUpdate\n`;
      const dataLine = `data: ${JSON.stringify(testData)}\n\n`;

      expect(mockResClient1.write).toHaveBeenCalledWith(eventLine);
      expect(mockResClient1.write).toHaveBeenCalledWith(dataLine);
      expect(mockResClient2.write).toHaveBeenCalledWith(eventLine);
      expect(mockResClient2.write).toHaveBeenCalledWith(dataLine);
      expect(mockResClient3.write).toHaveBeenCalledWith(eventLine);
      expect(mockResClient3.write).toHaveBeenCalledWith(dataLine);
    });

    it('should log an error if writing to a client fails', () => {
      sseManager.initializeSSE(mockApp as Express);
      const displayId = 'displayError'; // Use a specific displayId for adding the bad client
      const mockBadClientRes = {
        write: jest.fn().mockImplementation(() => {
          throw new Error('Client write failed');
        }),
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        end: jest.fn()
      } as unknown as Response; // Cast to Response
      
      sseManager.addClient(displayId, mockBadClientRes); // Add the client that will fail
      // Add a good client to ensure the loop continues and doesn't stop on first error
      const mockGoodClientRes = { ...mockRes, id: 'goodClient', write: jest.fn() } as unknown as Response; // Cast to Response
      sseManager.addClient('goodDisplay', mockGoodClientRes);

      expect(sseManager.getConnectedClients()[displayId].length).toBe(1);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      sseManager.sendSSEUpdate({ message: 'data for bad client' }); // This sends to ALL clients
      
      expect(mockBadClientRes.write).toHaveBeenCalled(); // write was attempted on bad client
      expect(mockGoodClientRes.write).toHaveBeenCalled(); // write was attempted on good client
      // The console.error comes from within sendSSEUpdate if sendSseEvent fails
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`[SSE] Error sending update to client: ${mockBadClientRes.toString()}`), expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
