import { Response } from 'express';
import * as sseManager from '../../api/sse_manager'; // Adjust path relative to __tests__/api
import { sendSseEvent } from '../../api/helpers/common_helper'; // Adjust path

// Mock the common_helper module
jest.mock('../../api/helpers/common_helper', () => ({
  sendSseEvent: jest.fn(),
}));

// Mock Express Response
const mockResponse = (id?: string) => { // Optional id for debugging/differentiation
  const res: Partial<Response & { mockId?: string }> = {};
  if (id) {
    res.mockId = id;
  }
  return res as Response;
};

describe('sse_manager', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset sseClients before each test
    sseManager.sseClients = {};
    // Clear mocks
    (sendSseEvent as jest.Mock).mockClear();
    // Spy on console.log and suppress output during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  describe('addClient', () => {
    it('should add a client to a new displayId', () => {
      const res1 = mockResponse();
      const displayId1 = 'display1';
      sseManager.addClient(displayId1, res1);
      expect(sseManager.sseClients[displayId1]).toContain(res1);
      expect(sseManager.sseClients[displayId1].length).toBe(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Client added for displayId: ${displayId1}`);
    });

    it('should add multiple clients to the same displayId', () => {
      const res1 = mockResponse();
      const res2 = mockResponse();
      const displayId1 = 'display1';
      sseManager.addClient(displayId1, res1);
      sseManager.addClient(displayId1, res2);
      expect(sseManager.sseClients[displayId1]).toContain(res1);
      expect(sseManager.sseClients[displayId1]).toContain(res2);
      expect(sseManager.sseClients[displayId1].length).toBe(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Client added for displayId: ${displayId1}`);
    });

    it('should store clients for different displayIds separately', () => {
      const res1 = mockResponse();
      const displayId1 = 'display1';
      const res2 = mockResponse();
      const displayId2 = 'display2';

      sseManager.addClient(displayId1, res1);
      sseManager.addClient(displayId2, res2);

      expect(sseManager.sseClients[displayId1]).toContain(res1);
      expect(sseManager.sseClients[displayId1].length).toBe(1);
      expect(sseManager.sseClients[displayId2]).toContain(res2);
      expect(sseManager.sseClients[displayId2].length).toBe(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Client added for displayId: ${displayId1}`);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Client added for displayId: ${displayId2}`);
    });
  });

  describe('removeClient', () => {
    it('should remove a client successfully', () => {
      const res1 = mockResponse();
      const res2 = mockResponse();
      const displayId1 = 'display1';
      sseManager.addClient(displayId1, res1);
      sseManager.addClient(displayId1, res2);

      sseManager.removeClient(displayId1, res1);
      expect(sseManager.sseClients[displayId1]).not.toContain(res1);
      expect(sseManager.sseClients[displayId1]).toContain(res2);
      expect(sseManager.sseClients[displayId1].length).toBe(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Client removed for displayId: ${displayId1}`);
    });

    it('should delete displayId key if it was the last client', () => {
      const res1 = mockResponse();
      const displayId1 = 'display1';
      sseManager.addClient(displayId1, res1);

      sseManager.removeClient(displayId1, res1);
      expect(sseManager.sseClients[displayId1]).toBeUndefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(`Client removed for displayId: ${displayId1}`);
    });

    it('should not affect other displayIds or other clients for the same displayId', () => {
      const res1 = mockResponse();
      const res2 = mockResponse();
      const res3 = mockResponse();
      const displayId1 = 'display1';
      const displayId2 = 'display2';

      sseManager.addClient(displayId1, res1);
      sseManager.addClient(displayId1, res2);
      sseManager.addClient(displayId2, res3);

      sseManager.removeClient(displayId1, res1);

      expect(sseManager.sseClients[displayId1]).not.toContain(res1);
      expect(sseManager.sseClients[displayId1]).toContain(res2);
      expect(sseManager.sseClients[displayId1].length).toBe(1);
      expect(sseManager.sseClients[displayId2]).toContain(res3);
      expect(sseManager.sseClients[displayId2].length).toBe(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Client removed for displayId: ${displayId1}`);
    });

    it('should not throw error if displayId does not exist', () => {
        const res1 = mockResponse();
        const displayId1 = 'nonExistentDisplay';
        expect(() => sseManager.removeClient(displayId1, res1)).not.toThrow();
        expect(consoleLogSpy).toHaveBeenCalledWith(`Client removed for displayId: ${displayId1}`);
    });

    it('should not throw error if client does not exist for displayId', () => {
        const res1 = mockResponse();
        const res2 = mockResponse();
        const displayId1 = 'display1';
        sseManager.addClient(displayId1, res1);
        expect(() => sseManager.removeClient(displayId1, res2)).not.toThrow();
        // Check that the original client is still there
        expect(sseManager.sseClients[displayId1]).toContain(res1);
        expect(sseManager.sseClients[displayId1].length).toBe(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(`Client removed for displayId: ${displayId1}`);
    });
  });

  describe('sendEventToDisplay', () => {
    it('should send an event to all clients for a specific displayId', () => {
      const res1 = mockResponse();
      const res2 = mockResponse();
      const displayId1 = 'display1';
      const eventName = 'testEvent';
      const data = { message: 'hello' };

      sseManager.addClient(displayId1, res1);
      sseManager.addClient(displayId1, res2);

      sseManager.sendEventToDisplay(displayId1, eventName, data);

      expect(sendSseEvent).toHaveBeenCalledTimes(2);
      expect(sendSseEvent).toHaveBeenCalledWith(res1, eventName, data);
      expect(sendSseEvent).toHaveBeenCalledWith(res2, eventName, data);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Sending event ${eventName} to 2 clients for displayId: ${displayId1}`);
    });

    it('should not send events to clients of other displayIds', () => {
      const res1 = mockResponse('res1');
      const res2 = mockResponse('res2'); // Client for another display
      const displayId1 = 'display1';
      const displayId2 = 'display2';
      const eventName = 'testEvent';
      const data = { message: 'hello' };

      sseManager.addClient(displayId1, res1);
      sseManager.addClient(displayId2, res2);

      sseManager.sendEventToDisplay(displayId1, eventName, data);

      expect(sendSseEvent).toHaveBeenCalledTimes(1);
      expect(sendSseEvent).toHaveBeenCalledWith(res1, eventName, data);
      expect(sendSseEvent).not.toHaveBeenCalledWith(res2, eventName, data);
      expect(consoleLogSpy).toHaveBeenCalledWith(`Sending event ${eventName} to 1 clients for displayId: ${displayId1}`);
    });

    it('should handle no clients for a displayId without error and not call sendSseEvent', () => {
      const displayId1 = 'displayWithNoClients';
      const eventName = 'testEvent';
      const data = { message: 'hello' };

      sseManager.sendEventToDisplay(displayId1, eventName, data);
      expect(sendSseEvent).not.toHaveBeenCalled();
      // console.log for sending event should not be called if no clients
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining(`Sending event ${eventName}`));
    });
  });
});
