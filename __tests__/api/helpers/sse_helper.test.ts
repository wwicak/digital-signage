import * as http from 'http';
import { Express } from 'express'; // Assuming Express types are installed

// Import the functions to be tested and reset module state for sendSSEUpdate's connectedClients array
let sseHelper = require('api/helpers/sse_helper.js'); // Keep require for now, may need path alias or direct import if sse_helper is also TS
const actualSseHelperPath = require.resolve('api/helpers/sse_helper.js');

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
    jest.resetModules();
    sseHelper = require(actualSseHelperPath); // Re-require to get fresh state

    mockApp = {
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
    } as unknown as MockResponse; // Cast to unknown first for complex mock
  });

  describe('initializeSSE', () => {
    it('should set up the /api/v1/events GET route', () => {
      sseHelper.initializeSSE(mockApp as Express);
      expect(mockApp.get).toHaveBeenCalledWith('/api/v1/events', expect.any(Function));
    });

    it('should set correct SSE headers and send initial event when a client connects', () => {
      sseHelper.initializeSSE(mockApp as Express);
      // Simulate a client connection by calling the route handler passed to app.get
      const routeHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
      routeHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.flushHeaders).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalledWith('event: connected\ndata: {"message":"SSE connection established"}\n\n');
      expect(sseHelper.getConnectedClientsCount()).toBe(1);
    });

    it('should remove a client when their connection closes', () => {
      sseHelper.initializeSSE(mockApp as Express);
      const routeHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
      routeHandler(mockReq, mockRes); 

      expect(sseHelper.getConnectedClientsCount()).toBe(1);

      expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
      const closeCallback = mockReq.on.mock.calls[0][1];
      closeCallback();

      expect(sseHelper.getConnectedClientsCount()).toBe(0);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('sendSSEUpdate', () => {
    it('should not send updates if no clients are connected', () => {
      sseHelper.sendSSEUpdate({ message: 'test' });
      expect(mockRes.write).not.toHaveBeenCalled();
    });

    it('should send updates to all connected clients', () => {
      const mockResClient1 = { write: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn(), end: jest.fn() } as unknown as MockResponse;
      const mockResClient2 = { write: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn(), end: jest.fn() } as unknown as MockResponse;
      
      sseHelper.initializeSSE(mockApp as Express);
      const routeHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
      
      // Client 1
      const mockReq1 = { on: jest.fn(), headers: {}, method: 'GET', url: '/', socket: {} as any } as MockRequest;
      routeHandler(mockReq1, mockResClient1);

      // Client 2
      const mockReq2 = { on: jest.fn(), headers: {}, method: 'GET', url: '/', socket: {} as any } as MockRequest;
      routeHandler(mockReq2, mockResClient2);

      expect(sseHelper.getConnectedClientsCount()).toBe(2);

      const testData = { message: 'live update' };
      sseHelper.sendSSEUpdate(testData);

      const expectedSSEFormattedData = `event: adminUpdate\ndata: ${JSON.stringify(testData)}\n\n`;
      expect(mockResClient1.write).toHaveBeenCalledWith(expectedSSEFormattedData);
      expect(mockResClient2.write).toHaveBeenCalledWith(expectedSSEFormattedData);
    });

    it('should log an error if writing to a client fails', () => {
      sseHelper.initializeSSE(mockApp as Express);
      const routeHandler = (mockApp.get as jest.Mock).mock.calls[0][1];
      const mockBadClientRes = {
        write: jest.fn().mockImplementation(() => { 
          throw new Error('Client write failed'); 
        }),
        setHeader: jest.fn(), // Add missing properties for MockResponse
        flushHeaders: jest.fn(),
        end: jest.fn()
      } as unknown as MockResponse;
      
      routeHandler(mockReq, mockBadClientRes);

      expect(sseHelper.getConnectedClientsCount()).toBe(1);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      sseHelper.sendSSEUpdate({ message: 'data for bad client' });
      
      expect(mockBadClientRes.write).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[SSE] Error sending update to client'), expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
