// Import the functions to be tested and reset module state for sendSSEUpdate's connectedClients array
let sseHelper = require('api/helpers/sse_helper.js');
const actualSseHelperPath = require.resolve('api/helpers/sse_helper.js');

describe('sse_helper', () => {
  let mockApp;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset modules to clear connectedClients array in sse_helper for each test
    jest.resetModules();
    sseHelper = require(actualSseHelperPath); // Re-require to get fresh state

    mockApp = {
      get: jest.fn(),
    };
    mockReq = {
      on: jest.fn(), // To mock 'close' event listener attachment
    };
    mockRes = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };
  });

  describe('initializeSSE', () => {
    it('should set up the /api/v1/events GET route', () => {
      sseHelper.initializeSSE(mockApp);
      expect(mockApp.get).toHaveBeenCalledWith('/api/v1/events', expect.any(Function));
    });

    it('should set correct SSE headers and send initial event when a client connects', () => {
      sseHelper.initializeSSE(mockApp);
      // Simulate a client connection by calling the route handler passed to app.get
      const routeHandler = mockApp.get.mock.calls[0][1];
      routeHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockRes.flushHeaders).toHaveBeenCalled();
      expect(mockRes.write).toHaveBeenCalledWith('event: connected\ndata: {"message":"SSE connection established"}\n\n');
      expect(sseHelper.getConnectedClientsCount()).toBe(1); // Assuming getConnectedClientsCount is exposed for testing
    });

    it('should remove a client when their connection closes', () => {
      sseHelper.initializeSSE(mockApp);
      const routeHandler = mockApp.get.mock.calls[0][1];
      routeHandler(mockReq, mockRes); // Client connects

      expect(sseHelper.getConnectedClientsCount()).toBe(1);

      // Simulate 'close' event
      // The 'close' event callback is the first argument to the first call of req.on
      expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
      const closeCallback = mockReq.on.mock.calls[0][1];
      closeCallback();

      expect(sseHelper.getConnectedClientsCount()).toBe(0);
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('sendSSEUpdate', () => {
    it('should not send updates if no clients are connected', () => {
      //spyOn(console, 'log'); // Optional: if you want to assert console logs
      sseHelper.sendSSEUpdate({ message: 'test' });
      //expect(console.log).toHaveBeenCalledWith('[SSE] No clients connected, skipping update.');
      expect(mockRes.write).not.toHaveBeenCalled(); // mockRes is for a single client, check no client.res.write happened
    });

    it('should send updates to all connected clients', () => {
      // Simulate two connected clients
      const mockResClient1 = { write: jest.fn() };
      const mockResClient2 = { write: jest.fn() };
      
      // Manually add clients for this test (since initializeSSE and its route handler are complex to call repeatedly here)
      // This requires a way to modify connectedClients from outside or a more advanced setup.
      // For simplicity, we'll assume getConnectedClientsCount() was tested and we can rely on internal client management.
      // The ideal way is to call the route handler multiple times if it's easy.
      
      // Connect first client
      sseHelper.initializeSSE(mockApp);
      const routeHandler = mockApp.get.mock.calls[0][1];
      routeHandler(mockReq, mockResClient1); // mockReq will be reused, but res is unique

      // Connect second client (need a new mockReq for 'close' listeners to be distinct if req is stored per client)
      const mockReq2 = { on: jest.fn() };
      routeHandler(mockReq2, mockResClient2);

      expect(sseHelper.getConnectedClientsCount()).toBe(2);

      const testData = { message: 'live update' };
      sseHelper.sendSSEUpdate(testData);

      const expectedSSEFormattedData = `event: adminUpdate\ndata: ${JSON.stringify(testData)}\n\n`;
      expect(mockResClient1.write).toHaveBeenCalledWith(expectedSSEFormattedData);
      expect(mockResClient2.write).toHaveBeenCalledWith(expectedSSEFormattedData);
    });

    it('should log an error if writing to a client fails', () => {
      sseHelper.initializeSSE(mockApp);
      const routeHandler = mockApp.get.mock.calls[0][1];
      const mockBadClientRes = {
        write: jest.fn().mockImplementation(() => { 
          throw new Error('Client write failed'); 
        })
      };
      routeHandler(mockReq, mockBadClientRes);

      expect(sseHelper.getConnectedClientsCount()).toBe(1);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error output for this test
      
      sseHelper.sendSSEUpdate({ message: 'data for bad client' });
      
      expect(mockBadClientRes.write).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[SSE] Error sending update to client'), expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});
