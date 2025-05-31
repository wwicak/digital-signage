import express, { Request, Response, NextFunction, Router } from 'express';
import mongoose from 'mongoose';

const mockObjectIdString = () => new mongoose.Types.ObjectId().toHexString();
const mockObjectId = () => new mongoose.Types.ObjectId();

// Define mockDocument at the top level
const mockDisplayDocument = (data: any): any => {
  const docId = data._id || mockObjectId();
  const document = {
    ...data,
    _id: docId,
    id: docId.toString(),
    name: data.name || 'Mocked Display',
    creator_id: data.creator_id || mockObjectIdString(),
    widgets: data.widgets || [],
    save: jest.fn(),
    populate: jest.fn(),
    execPopulate: jest.fn(),
  };
  document.save.mockResolvedValue(document);
  document.populate.mockImplementation(function(this: any, populatePath: string) {
    if (populatePath === 'widgets') {
      const populatedSelf = { ...this, widgets: this.widgets.map((w:any) => (typeof w === 'string' || w instanceof mongoose.Types.ObjectId ? {_id:w, name:"Populated Widget"} : w ))};
      return Promise.resolve(populatedSelf);
    }
    return Promise.resolve(this);
  });
  document.execPopulate.mockResolvedValue(document); // Default for execPopulate
  return document;
};

jest.mock('../../../api/models/Display', () => {
  const MockedDisplayConstructor = jest.fn().mockImplementation(data => mockDisplayDocument(data));

  MockedDisplayConstructor.findOne = jest.fn();
  MockedDisplayConstructor.findById = jest.fn();
  MockedDisplayConstructor.findByIdAndDelete = jest.fn();
  MockedDisplayConstructor.find = jest.fn();

  return {
    __esModule: true,
    default: MockedDisplayConstructor,
  };
});
jest.mock('../../../api/models/Widget');


// Mock helpers
import * as commonHelper from '../../../api/helpers/common_helper';
import * as displayHelper from '../../../api/helpers/display_helper';
import * as sseManager from '../../../api/sse_manager';

jest.mock('../../../api/helpers/common_helper', () => ({
  __esModule: true,
  findAllAndSend: jest.fn(),
  sendSseEvent: jest.fn(),
}));
jest.mock('../../../api/helpers/display_helper', () => ({
  __esModule: true,
  createWidgetsForDisplay: jest.fn(),
  updateWidgetsForDisplay: jest.fn(),
  deleteWidgetsForDisplay: jest.fn(),
}));
jest.mock('../../../api/sse_manager', () => ({
  __esModule: true,
  addClient: jest.fn(),
  removeClient: jest.fn(),
  sendEventToDisplay: jest.fn(),
}));

import displayRouter from '../../../api/routes/display';
import Display from '../../../api/models/Display';


const mockRequest = (user?: any, params?: any, body?: any, query?: any): Partial<Request> => ({
  user,
  params,
  body,
  query,
  isAuthenticated: user ? jest.fn(() => true) : jest.fn(() => false),
  on: jest.fn(),
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.flushHeaders = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn() as NextFunction;


describe('/api/routes/display.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testUser = { _id: mockObjectIdString(), username: 'testuser' };

  const getRouteHandlerStack = (method: 'get' | 'post' | 'put' | 'delete', path: string) => {
    const routeLayer = displayRouter.stack.find(
      (r) => r.route && r.route.path === path && r.route.methods[method]
    );
    if (!routeLayer || !routeLayer.route) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    return routeLayer.route.stack;
  };

  describe('GET /', () => {
    it('should call findAllAndSend for authenticated user', async () => {
      const req = mockRequest(testUser) as Request;
      const res = mockResponse() as Response;
      const handlers = getRouteHandlerStack('get', '/');
      await handlers[1].handle(req, res, mockNext);

      expect(commonHelper.findAllAndSend).toHaveBeenCalledWith(
        Display,
        res,
        'widgets',
        { creator_id: testUser._id }
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const ensureAuth = getRouteHandlerStack('get', '/')[0].handle;
      await ensureAuth(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });
  });

  describe('GET /:id', () => {
    it('should return display if found and user is authorized', async () => {
      const displayId = mockObjectIdString();
      const mockDocData = { _id: displayId, name: 'My Display', creator_id: testUser._id, widgets: [] };
      const populatedDoc = mockDisplayDocument({ ...mockDocData, widgets: [{_id: mockObjectId(), name: "Populated Widget"}] });

      (Display.findOne as jest.Mock).mockReturnValue({
          populate: jest.fn().mockResolvedValue(populatedDoc)
      });

      const req = mockRequest(testUser, { id: displayId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('get', '/:id')[1].handle;

      await handler(req, res, mockNext);

      expect(Display.findOne).toHaveBeenCalledWith({ _id: displayId, creator_id: testUser._id });
      expect((Display.findOne as jest.Mock).mock.results[0].value.populate).toHaveBeenCalledWith('widgets');
      expect(res.json).toHaveBeenCalledWith(populatedDoc);
    });

    it('should return 404 if display not found', async () => {
      const displayId = mockObjectIdString();
      (Display.findOne as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      const req = mockRequest(testUser, { id: displayId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('get', '/:id')[1].handle;

      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Display not found or not authorized.' });
    });
  });

  describe('POST /', () => {
    it('should create a new display with widgets and return 201', async () => {
      const widgetsData = [{ name: 'Widget 1', type: 'typeA', x:0,y:0,w:1,h:1,data:{} }];
      const displayData = { name: 'New Display', widgets: widgetsData };
      const savedDisplayId = mockObjectId();

      const newDisplayInstance = mockDisplayDocument({
        name: displayData.name,
        _id: savedDisplayId,
        creator_id: testUser._id,
        widgets: []
      });

      const finalPopulatedDisplay = {
        ...newDisplayInstance,
        _id: savedDisplayId, // ensure ID is consistent
        widgets: [{_id: 'widgetId1', name: 'Populated Widget'}]
      };
      newDisplayInstance.save.mockResolvedValue(newDisplayInstance); // save returns the instance
      newDisplayInstance.populate.mockResolvedValue(finalPopulatedDisplay); // Populate on the instance

      (Display as jest.Mock).mockImplementation(() => newDisplayInstance);
      (displayHelper.createWidgetsForDisplay as jest.Mock).mockImplementation(async (displayDoc, _widgets, _creator) => {
        displayDoc.widgets.push('widgetId1');
        return ['widgetId1'];
      });

      const req = mockRequest(testUser, {}, displayData) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('post', '/')[1].handle;

      await handler(req, res, mockNext);

      expect(Display).toHaveBeenCalledWith(expect.objectContaining({name: 'New Display', creator_id: testUser._id}));
      expect(displayHelper.createWidgetsForDisplay).toHaveBeenCalled();
      expect(newDisplayInstance.save).toHaveBeenCalled();
      expect(newDisplayInstance.populate).toHaveBeenCalledWith('widgets');
      expect(sseManager.sendEventToDisplay).toHaveBeenCalledWith(savedDisplayId.toString(), 'display_updated', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(finalPopulatedDisplay);
    });
  });

   describe('PUT /:id', () => {
    const displayId = mockObjectIdString();

    it('should update a display and return it', async () => {
      const updateData = { name: 'Updated Display Name' };
      const widgetIds = [mockObjectId()];
      const existingDisplayDoc = mockDisplayDocument({ _id: displayId, name: 'Old Name', creator_id: testUser._id, widgets: [] });

      const finalPopulatedDisplay = {
        ...existingDisplayDoc,
        ...updateData,
        widgets: [{_id: widgetIds[0], name: "Populated Widget"}]
      };
      existingDisplayDoc.save.mockResolvedValue({ ...existingDisplayDoc, ...updateData, widgets: widgetIds });
      existingDisplayDoc.populate.mockResolvedValue(finalPopulatedDisplay);

      (Display.findOne as jest.Mock).mockResolvedValue(existingDisplayDoc);
      (displayHelper.updateWidgetsForDisplay as jest.Mock).mockResolvedValue(widgetIds);

      const reqBody = { ...updateData, widgets: [{_id: widgetIds[0].toHexString(), name: 'updatedWidget'}] };
      const req = mockRequest(testUser, { id: displayId }, reqBody) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('put', '/:id')[1].handle;

      await handler(req, res, mockNext);

      expect(Display.findOne).toHaveBeenCalledWith({ _id: displayId, creator_id: testUser._id });
      expect(displayHelper.updateWidgetsForDisplay).toHaveBeenCalled();
      expect(existingDisplayDoc.save).toHaveBeenCalled();
      expect(existingDisplayDoc.populate).toHaveBeenCalledWith('widgets');
      expect(sseManager.sendEventToDisplay).toHaveBeenCalledWith(displayId, 'display_updated', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(finalPopulatedDisplay);
    });
  });

  describe('DELETE /:id', () => {
    const displayId = mockObjectIdString();

    it('should delete a display and its widgets', async () => {
      const displayToDelete = mockDisplayDocument({ _id: displayId, creator_id: testUser._id });
      (Display.findOne as jest.Mock).mockResolvedValue(displayToDelete);
      (displayHelper.deleteWidgetsForDisplay as jest.Mock).mockResolvedValue(undefined);
      (Display.findByIdAndDelete as jest.Mock).mockResolvedValue(displayToDelete);

      const req = mockRequest(testUser, { id: displayId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('delete', '/:id')[1].handle;

      await handler(req, res, mockNext);

      expect(Display.findOne).toHaveBeenCalledWith({ _id: displayId, creator_id: testUser._id });
      expect(displayHelper.deleteWidgetsForDisplay).toHaveBeenCalledWith(displayToDelete);
      expect(Display.findByIdAndDelete).toHaveBeenCalledWith(displayId);
      expect(sseManager.sendEventToDisplay).toHaveBeenCalledWith(displayId, 'display_updated', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: 'Display and associated widgets deleted successfully' });
    });
  });

  describe('GET /:displayId/events', () => {
    it('should set SSE headers and add client', () => {
      const displayIdParam = mockObjectIdString();
      const req = mockRequest(testUser, { displayId: displayIdParam }) as Request;
      const res = mockResponse() as Response;

      const routeHandler = getRouteHandlerStack('get', '/:displayId/events')[0].handle;
      if (!routeHandler) throw new Error("Route handler not found");

      routeHandler(req, res, mockNext);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(sseManager.addClient).toHaveBeenCalledWith(displayIdParam, res);
      expect(commonHelper.sendSseEvent).toHaveBeenCalledWith(res, 'connected', { message: 'SSE connection established' });

      const closeCallback = (req.on as jest.Mock).mock.calls.find(call => call[0] === 'close');
      if (closeCallback && closeCallback[1]) {
        closeCallback[1]();
        expect(sseManager.removeClient).toHaveBeenCalledWith(displayIdParam, res);
      } else {
        throw new Error("req.on('close', ...) was not called or callback not found");
      }
    });
  });
});
