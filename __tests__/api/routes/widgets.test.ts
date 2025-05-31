import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

const mockObjectIdString = () => new mongoose.Types.ObjectId().toHexString();
const mockObjectId = () => new mongoose.Types.ObjectId();

const mockWidgetDocument = (data: any): any => {
  const docId = data._id || mockObjectId();
  const document = {
    ...data,
    _id: docId,
    id: docId.toString(),
    name: data.name || 'Mocked Widget',
    type: data.type || 'typeA',
    creator_id: data.creator_id || mockObjectIdString(),
    save: jest.fn(),
    populate: jest.fn().mockReturnThis(), // Keep for general Mongoose doc compatibility
    execPopulate: jest.fn(),
  };
  document.save.mockResolvedValue(document);
  document.execPopulate.mockResolvedValue(document);
  return document;
};

jest.mock('../../../api/models/Widget', () => {
  const MockedWidgetConstructor = jest.fn().mockImplementation(data => mockWidgetDocument(data));
  MockedWidgetConstructor.findOne = jest.fn();
  MockedWidgetConstructor.find = jest.fn();
  MockedWidgetConstructor.findByIdAndUpdate = jest.fn();
  MockedWidgetConstructor.findByIdAndDelete = jest.fn();
  return {
    __esModule: true,
    default: MockedWidgetConstructor,
    WidgetType: { TYPE_A: 'typeA', TYPE_B: 'typeB' },
  };
});

import * as widgetHelper from '../../../api/helpers/widget_helper';
jest.mock('../../../api/helpers/widget_helper', () => ({
  __esModule: true,
  validateWidgetData: jest.fn().mockResolvedValue(undefined),
  deleteWidgetAndCleanReferences: jest.fn(),
}));

import widgetsRouter from '../../../api/routes/widgets';
import Widget from '../../../api/models/Widget'; // Mocked version

const mockRequest = (user?: any, params?: any, body?: any, query?: any): Partial<Request> => ({
  user,
  params,
  body,
  query,
  isAuthenticated: user ? jest.fn(() => true) : jest.fn(() => false),
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn() as NextFunction;

describe('/api/routes/widgets.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testUser = { _id: mockObjectIdString(), username: 'testuser' };

  const getRouteHandlers = (method: 'get' | 'post' | 'put' | 'delete', path: string) => {
    const routeLayer = widgetsRouter.stack.find(
      (r) => r.route && r.route.path === path && r.route.methods[method]
    );
    if (!routeLayer || !routeLayer.route) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    return routeLayer.route.stack.map(s => s.handle);
  };

  describe('Authentication Middleware (ensureAuthenticated)', () => {
    const routesToTest = [
      { method: 'get', path: '/' },
      { method: 'get', path: '/:id' },
      { method: 'post', path: '/' },
      { method: 'put', path: '/:id' },
      { method: 'delete', path: '/:id' },
    ];

    routesToTest.forEach(routeInfo => {
      it(`should return 401 for ${routeInfo.method.toUpperCase()} ${routeInfo.path} if not authenticated`, async () => {
        const req = mockRequest() as Request; // No user
        const res = mockResponse() as Response;
        const ensureAuthHandler = getRouteHandlers(routeInfo.method as any, routeInfo.path)[0];
        await ensureAuthHandler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
      });
    });
  });


  describe('GET /', () => {
    it('should return widgets for authenticated user', async () => {
      const req = mockRequest(testUser) as Request;
      const res = mockResponse() as Response;
      const mockWidgets = [mockWidgetDocument({ name: 'Widget1' }), mockWidgetDocument({ name: 'Widget2' })];
      (Widget.find as jest.Mock).mockResolvedValue(mockWidgets);
      const handler = getRouteHandlers('get', '/')[1];

      await handler(req, res, mockNext);
      expect(Widget.find).toHaveBeenCalledWith({ creator_id: testUser._id });
      expect(res.json).toHaveBeenCalledWith(mockWidgets);
    });

    it('should return 500 on database error', async () => {
        const req = mockRequest(testUser) as Request;
        const res = mockResponse() as Response;
        const error = new Error("DB Find Error");
        (Widget.find as jest.Mock).mockRejectedValue(error);
        const handler = getRouteHandlers('get', '/')[1];

        await handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching widgets.', error: error.message });
    });
  });

  describe('GET /:id', () => {
    it('should return widget if found and user is authorized', async () => {
      const widgetId = mockObjectIdString();
      const mockDoc = mockWidgetDocument({ _id: widgetId, creator_id: testUser._id });
      (Widget.findOne as jest.Mock).mockResolvedValue(mockDoc);
      const req = mockRequest(testUser, { id: widgetId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('get', '/:id')[1];

      await handler(req, res, mockNext);
      expect(Widget.findOne).toHaveBeenCalledWith({ _id: widgetId, creator_id: testUser._id });
      expect(res.json).toHaveBeenCalledWith(mockDoc);
    });

    it('should return 404 if widget not found', async () => {
      const widgetId = mockObjectIdString();
      (Widget.findOne as jest.Mock).mockResolvedValue(null);
      const req = mockRequest(testUser, { id: widgetId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('get', '/:id')[1];

      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Widget not found or not authorized.' });
    });

     it('should return 500 on database error', async () => {
      const widgetId = mockObjectIdString();
      const error = new Error("DB error");
      (Widget.findOne as jest.Mock).mockRejectedValue(error);
      const req = mockRequest(testUser, { id: widgetId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('get', '/:id')[1];

      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error fetching widget.', error: error.message });
    });
  });

  describe('POST /', () => {
    it('should create a new widget and return 201', async () => {
      const widgetData = { name: 'New Widget', type: 'typeA', data: { detail: 'value' } };
      const savedWidgetDoc = mockWidgetDocument({ ...widgetData, creator_id: testUser._id });
      const newWidgetInstance = mockWidgetDocument(widgetData);
      newWidgetInstance.save.mockResolvedValue(savedWidgetDoc);
      (Widget as jest.Mock).mockImplementation(() => newWidgetInstance);
      (widgetHelper.validateWidgetData as jest.Mock).mockResolvedValue(undefined);

      const req = mockRequest(testUser, {}, widgetData) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('post', '/')[1];

      await handler(req, res, mockNext);
      expect(widgetHelper.validateWidgetData).toHaveBeenCalledWith(widgetData.type, widgetData.data);
      expect(Widget).toHaveBeenCalledWith(expect.objectContaining({ name: widgetData.name, creator_id: testUser._id }));
      expect(newWidgetInstance.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedWidgetDoc);
    });

    it('should return 400 if name or type is missing', async () => {
      const req = mockRequest(testUser, {}, { name: 'Only Name' }) as Request; // type is missing
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('post', '/')[1];
      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Widget name and type are required.' });
    });

    it('should return 400 if validateWidgetData throws "Invalid data for..." error', async () => {
        const widgetData = { name: 'New Widget', type: 'typeA', data: {} };
        const validationError = new Error("Invalid data for widget type typeA");
        (widgetHelper.validateWidgetData as jest.Mock).mockRejectedValue(validationError);
        const req = mockRequest(testUser, {}, widgetData) as Request;
        const res = mockResponse() as Response;
        const handler = getRouteHandlers('post', '/')[1];

        await handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: validationError.message });
    });

    it('should return 400 on Mongoose ValidationError from save', async () => {
        const widgetData = { name: 'New Widget', type: 'typeA', data: {} };
        const validationError: any = new Error("Validation Failed");
        validationError.name = "ValidationError";
        validationError.errors = { field: { message: "is bad"} };

        const newWidgetInstance = mockWidgetDocument(widgetData);
        newWidgetInstance.save.mockRejectedValue(validationError);
        (Widget as jest.Mock).mockImplementation(() => newWidgetInstance);
        (widgetHelper.validateWidgetData as jest.Mock).mockResolvedValue(undefined);

        const req = mockRequest(testUser, {}, widgetData) as Request;
        const res = mockResponse() as Response;
        const handler = getRouteHandlers('post', '/')[1];

        await handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Validation Error', errors: validationError.errors });
    });

    it('should return 500 on other save errors', async () => {
        const widgetData = { name: 'New Widget', type: 'typeA', data: {} };
        const dbError = new Error("DB error");

        const newWidgetInstance = mockWidgetDocument(widgetData);
        newWidgetInstance.save.mockRejectedValue(dbError);
        (Widget as jest.Mock).mockImplementation(() => newWidgetInstance);
        (widgetHelper.validateWidgetData as jest.Mock).mockResolvedValue(undefined);

        const req = mockRequest(testUser, {}, widgetData) as Request;
        const res = mockResponse() as Response;
        const handler = getRouteHandlers('post', '/')[1];

        await handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error creating widget', error: dbError.message });
    });
  });

  describe('PUT /:id', () => {
    const widgetId = mockObjectIdString();
    it('should update a widget and return it', async () => {
      const updateData = { name: 'Updated Widget Name', data: { newValue: true } };
      const existingWidgetDoc = mockWidgetDocument({ _id: widgetId, name: 'Old Name', type: 'typeA', data: {oldValue: false}, creator_id: testUser._id });
      const savedWidgetDoc = { ...existingWidgetDoc, ...updateData }; // This is what save resolves to

      (Widget.findOne as jest.Mock).mockResolvedValue(existingWidgetDoc);
      existingWidgetDoc.save.mockResolvedValue(savedWidgetDoc); // Configure save on the instance
      (widgetHelper.validateWidgetData as jest.Mock).mockResolvedValue(undefined);

      const req = mockRequest(testUser, { id: widgetId }, updateData) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('put', '/:id')[1];

      await handler(req, res, mockNext);
      expect(Widget.findOne).toHaveBeenCalledWith({ _id: widgetId, creator_id: testUser._id });
      expect(widgetHelper.validateWidgetData).toHaveBeenCalledWith(existingWidgetDoc.type, updateData.data);
      expect(existingWidgetDoc.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(savedWidgetDoc);
    });

    it('should return 404 if widget to update not found', async () => {
        (Widget.findOne as jest.Mock).mockResolvedValue(null);
        const req = mockRequest(testUser, { id: widgetId }, { name: "Update" }) as Request;
        const res = mockResponse() as Response;
        const handler = getRouteHandlers('put', '/:id')[1];
        await handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Widget not found or not authorized' });
    });
  });

  describe('DELETE /:id', () => {
    const widgetId = mockObjectIdString();
    it('should delete a widget and its references', async () => {
      const widgetToDelete = mockWidgetDocument({ _id: widgetId, creator_id: testUser._id });
      (Widget.findOne as jest.Mock).mockResolvedValue(widgetToDelete);
      (widgetHelper.deleteWidgetAndCleanReferences as jest.Mock).mockResolvedValue(widgetToDelete); // Assume it returns the deleted doc

      const req = mockRequest(testUser, { id: widgetId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('delete', '/:id')[1];

      await handler(req, res, mockNext);
      expect(Widget.findOne).toHaveBeenCalledWith({ _id: widgetId, creator_id: testUser._id });
      expect(widgetHelper.deleteWidgetAndCleanReferences).toHaveBeenCalledWith(widgetId);
      expect(res.json).toHaveBeenCalledWith({ message: 'Widget deleted successfully and removed from displays' });
    });

    it('should return 404 if widget to delete not found by findOne', async () => {
        (Widget.findOne as jest.Mock).mockResolvedValue(null);
        const req = mockRequest(testUser, { id: widgetId }) as Request;
        const res = mockResponse() as Response;
        const handler = getRouteHandlers('delete', '/:id')[1];
        await handler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Widget not found or not authorized' });
    });

    it('should return 404 if deleteWidgetAndCleanReferences returns null', async () => {
      const widgetToDelete = mockWidgetDocument({ _id: widgetId, creator_id: testUser._id });
      (Widget.findOne as jest.Mock).mockResolvedValue(widgetToDelete);
      (widgetHelper.deleteWidgetAndCleanReferences as jest.Mock).mockResolvedValue(null);

      const req = mockRequest(testUser, { id: widgetId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('delete', '/:id')[1];

      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Widget not found during deletion process.' });
    });

     it('should return 500 if deleteWidgetAndCleanReferences throws error', async () => {
      const widgetToDelete = mockWidgetDocument({ _id: widgetId, creator_id: testUser._id });
      const error = new Error("Deletion helper failed");
      (Widget.findOne as jest.Mock).mockResolvedValue(widgetToDelete);
      (widgetHelper.deleteWidgetAndCleanReferences as jest.Mock).mockRejectedValue(error);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(()=>{});

      const req = mockRequest(testUser, { id: widgetId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlers('delete', '/:id')[1];

      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error deleting widget', error: error.message });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
