import * as http from 'http';
import { Express, Response } from 'express'; // Import Response from express
// Using Jest globals: describe, it, expect, beforeEach, jest (for spyOn, resetModules)

// Import the functions to be tested
// Use the relative path that Jest was able to resolve previously
import * as sseManager from '../../api/sse_manager';

interface MockRequest extends http.IncomingMessage {
  on: jest.Mock;
}

// Custom MockResponse interface is removed. We'll create partial mocks typed as express.Response.

describe('sse_manager', () => {
  let mockApp: Partial<Express>;
  let mockReq: MockRequest;
  let mockRes: Response; // Use imported express.Response

  beforeEach(() => {
    sseManager.resetSseClientsForTesting(); // Use the exported reset function

    mockApp = { // mockApp is used by initializeSSE which is now a placeholder
      get: jest.fn(),
    };
    mockReq = {
      on: jest.fn(),
      headers: {},
      method: 'GET',
      url: '/',
      socket: {} as any, // Simplified for mock
      // http.IncomingMessage properties
      httpVersion: '1.1',
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      complete: false,
      connection: {} as any,
      setTimeout: jest.fn(),
      read: jest.fn(),
      destroy: jest.fn(),
      resume: jest.fn(),
      pause: jest.fn(),
      unpipe: jest.fn(),
      unshift: jest.fn(),
      wrap: jest.fn(),
      setEncoding: jest.fn(),
      pipe: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      emit: jest.fn(),
      eventNames: jest.fn(),
      getMaxListeners: jest.fn(),
      listenerCount: jest.fn(),
      listeners: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      rawListeners: jest.fn(),

    } as unknown as MockRequest; // Cast as it's a partial mock

    mockRes = {
      setHeader: jest.fn().mockReturnThis(),
      flushHeaders: jest.fn().mockReturnThis(),
      write: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(), // Added 'on' for completeness if needed by SUT for res
      statusCode: 200,
      statusMessage: 'OK',
      writableEnded: false,
      // Add other necessary express.Response mocks if sseManager uses them
      // For now, these cover what sendSseEvent and client management might touch.
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
  });

  // initializeSSE is now a placeholder in the source.
  // Tests now focus on addClient, removeClient, and sendSSEUpdate directly.
  describe('addClient and removeClient', () => {
    const displayId = 'testDisplay';

    it('should add a client to a displayId', () => {
      sseManager.addClient(displayId, mockRes);
      const clients = sseManager.getConnectedClients();
      expect(clients[displayId]).toBeDefined();
      expect(clients[displayId]).toContain(mockRes);
      expect(clients[displayId].length).toBe(1);
    });

    it('should add multiple clients to the same displayId', () => {
      const mockRes2 = { ...mockRes, id: 'client2' } as unknown as Response;
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
      const mockRes2 = { ...mockRes, id: 'client2' } as unknown as Response;
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
      const mockResClient1 = { ...mockRes, id: 'client1', write: jest.fn() } as unknown as Response;
      const mockResClient2 = { ...mockRes, id: 'client2', write: jest.fn() } as unknown as Response;
      const mockResClient3 = { ...mockRes, id: 'client3', write: jest.fn() } as unknown as Response;
      
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
      // sseManager.initializeSSE(mockApp as Express); // initializeSSE is a placeholder
      const displayId = 'displayError';
      const mockBadClientRes = {
        write: jest.fn().mockImplementation(() => {
          throw new Error('Client write failed');
        }),
        setHeader: jest.fn().mockReturnThis(),
        flushHeaders: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as Response;
      
      sseManager.addClient(displayId, mockBadClientRes);
      const mockGoodClientRes = { ...mockRes, id: 'goodClient', write: jest.fn() } as unknown as Response;
      sseManager.addClient('goodDisplay', mockGoodClientRes);

      expect(sseManager.getConnectedClients()[displayId].length).toBe(1);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      sseManager.sendSSEUpdate({ message: 'data for bad client' });
      
      expect(mockBadClientRes.write).toHaveBeenCalled();
      expect(mockGoodClientRes.write).toHaveBeenCalled(); // Ensure good client was also attempted
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`[SSE] Error sending update to client: ${mockBadClientRes.toString()}`), expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
