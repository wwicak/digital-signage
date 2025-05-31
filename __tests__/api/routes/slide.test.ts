import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

const mockObjectIdString = () => new mongoose.Types.ObjectId().toHexString();
const mockObjectId = () => new mongoose.Types.ObjectId();

const mockSlideDocument = (data: any): any => {
  const docId = data._id || mockObjectId();
  const document = {
    ...data,
    _id: docId,
    id: docId.toString(),
    name: data.name || 'Mocked Slide',
    type: data.type || 'image',
    data: data.data || { url: 'http://example.com/image.png' },
    creator_id: data.creator_id || mockObjectIdString(),
    save: jest.fn(),
    populate: jest.fn().mockReturnThis(), // For general compatibility
    execPopulate: jest.fn(), // For general compatibility
  };
  document.save.mockResolvedValue(document);
  document.execPopulate.mockResolvedValue(document); // Default to self if called
  return document;
};

const mockSlideshowDocument = (data: any): any => ({
    _id: data._id || mockObjectId(),
    name: data.name || 'Mocked Slideshow',
    slides: data.slides || [],
});


jest.mock('../../../api/models/Slide', () => {
  const MockedSlideConstructor = jest.fn().mockImplementation(data => mockSlideDocument(data));
  MockedSlideConstructor.findOne = jest.fn();
  MockedSlideConstructor.find = jest.fn();
  MockedSlideConstructor.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: MockedSlideConstructor };
});
jest.mock('../../../api/models/Slideshow', () => {
    const MockedSlideshowConstructor = jest.fn().mockImplementation(data => mockSlideshowDocument(data));
    MockedSlideshowConstructor.find = jest.fn();
    MockedSlideshowConstructor.updateMany = jest.fn();
    return {__esModule: true, default: MockedSlideshowConstructor };
});


import * as commonHelper from '../../../api/helpers/common_helper';
import * as slideHelper from '../../../api/helpers/slide_helper';

jest.mock('../../../api/helpers/common_helper', () => ({
  __esModule: true,
  findAllAndSend: jest.fn(),
}));
jest.mock('../../../api/helpers/slide_helper', () => ({
  __esModule: true,
  handleSlideInSlideshows: jest.fn().mockResolvedValue(undefined),
  deleteSlideAndCleanReferences: jest.fn(),
}));

import slideRouter from '../../../api/routes/slide';
import Slide from '../../../api/models/Slide';
import Slideshow from '../../../api/models/Slideshow';


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
  return res;
};
const mockNext = jest.fn() as NextFunction;

describe('/api/routes/slide.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testUser = { _id: mockObjectIdString(), username: 'testuser' };

  const getRouteHandlerStack = (method: 'get' | 'post' | 'put' | 'delete', path: string) => {
    const routeLayer = slideRouter.stack.find(
      (r) => r.route && r.route.path === path && r.route.methods[method]
    );
    if (!routeLayer || !routeLayer.route) throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
    return routeLayer.route.stack;
  };

  describe('Authentication Middleware', () => {
    const routesToTest = [
      { method: 'get', path: '/' }, { method: 'get', path: '/:id' },
      { method: 'post', path: '/' }, { method: 'put', path: '/:id' },
      { method: 'delete', path: '/:id' },
    ];
    routesToTest.forEach(routeInfo => {
      it(`should return 401 for ${routeInfo.method.toUpperCase()} ${routeInfo.path} if not authenticated`, async () => {
        const req = mockRequest() as Request;
        const res = mockResponse() as Response;
        const ensureAuthHandler = getRouteHandlerStack(routeInfo.method as any, routeInfo.path)[0].handle;
        await ensureAuthHandler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
      });
    });
  });

  describe('GET /', () => {
    it('should call findAllAndSend with Slide model and user ID', async () => {
      const req = mockRequest(testUser) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('get', '/')[1].handle;
      await handler(req, res, mockNext);
      expect(commonHelper.findAllAndSend).toHaveBeenCalledWith(
        Slide, res, undefined, { creator_id: testUser._id }
      );
    });
  });

  describe('GET /:id', () => {
    it('should return slide if found', async () => {
      const slideId = mockObjectIdString();
      const mockDoc = mockSlideDocument({ _id: slideId, creator_id: testUser._id });
      (Slide.findOne as jest.Mock).mockResolvedValue(mockDoc);
      const req = mockRequest(testUser, { id: slideId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('get', '/:id')[1].handle;
      await handler(req, res, mockNext);
      expect(Slide.findOne).toHaveBeenCalledWith({ _id: slideId, creator_id: testUser._id });
      expect(res.json).toHaveBeenCalledWith(mockDoc);
    });
    it('should return 404 if slide not found', async () => {
      const slideId = mockObjectIdString();
      (Slide.findOne as jest.Mock).mockResolvedValue(null);
      const req = mockRequest(testUser, { id: slideId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('get', '/:id')[1].handle;
      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('POST /', () => {
    it('should create a new slide and return 201', async () => {
      const slideData = { name: 'New Slide', type: 'image', data: { url: 'new.jpg' }, slideshow_ids: [mockObjectIdString()] };
      const savedSlideDoc = mockSlideDocument({ ...slideData, creator_id: testUser._id });
      const newSlideInstance = mockSlideDocument(slideData);
      newSlideInstance.save.mockResolvedValue(savedSlideDoc);
      (Slide as jest.Mock).mockImplementation(() => newSlideInstance);

      const req = mockRequest(testUser, {}, slideData) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('post', '/')[1].handle;

      await handler(req, res, mockNext);
      expect(Slide).toHaveBeenCalledWith(expect.objectContaining({ name: slideData.name }));
      expect(newSlideInstance.save).toHaveBeenCalled();
      expect(slideHelper.handleSlideInSlideshows).toHaveBeenCalledWith(savedSlideDoc, slideData.slideshow_ids, []);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(savedSlideDoc);
    });
     it('should return 400 if name, type or data is missing', async () => {
      const req = mockRequest(testUser, {}, { name: 'Test' }) as Request; // Missing type and data
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('post', '/')[1].handle;
      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Slide name, type, and data are required.' });
    });
  });

  describe('PUT /:id', () => {
    const slideId = mockObjectIdString();
    it('should update a slide and return it', async () => {
      const updateData = { name: 'Updated Slide Name', slideshow_ids: [mockObjectIdString()] };
      const originalSlideshows = [{_id: mockObjectId()}];
      const existingSlideDoc = mockSlideDocument({ _id: slideId, creator_id: testUser._id });
      existingSlideDoc.save.mockResolvedValue({ ...existingSlideDoc, ...updateData });

      (Slide.findOne as jest.Mock).mockResolvedValue(existingSlideDoc);
      (Slideshow.find as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue(originalSlideshows) });


      const req = mockRequest(testUser, { id: slideId }, updateData) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('put', '/:id')[1].handle;

      await handler(req, res, mockNext);
      expect(Slide.findOne).toHaveBeenCalledWith({ _id: slideId, creator_id: testUser._id });
      expect(existingSlideDoc.save).toHaveBeenCalled();
      expect(slideHelper.handleSlideInSlideshows).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({name: updateData.name}));
    });
     it('should return 404 if slide to update not found', async () => {
      (Slide.findOne as jest.Mock).mockResolvedValue(null);
      const req = mockRequest(testUser, { id: slideId }, { name: "Update" }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('put', '/:id')[1].handle;
      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /:id', () => {
    const slideId = mockObjectIdString();
    it('should delete a slide and its references', async () => {
      const slideToDelete = mockSlideDocument({ _id: slideId, creator_id: testUser._id });
      (Slide.findOne as jest.Mock).mockResolvedValue(slideToDelete);
      (slideHelper.deleteSlideAndCleanReferences as jest.Mock).mockResolvedValue(slideToDelete);

      const req = mockRequest(testUser, { id: slideId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('delete', '/:id')[1].handle;

      await handler(req, res, mockNext);
      expect(Slide.findOne).toHaveBeenCalledWith({ _id: slideId, creator_id: testUser._id });
      expect(slideHelper.deleteSlideAndCleanReferences).toHaveBeenCalledWith(slideId);
      expect(res.json).toHaveBeenCalledWith({ message: 'Slide deleted successfully' });
    });
     it('should return 404 if slide to delete not found by findOne', async () => {
      (Slide.findOne as jest.Mock).mockResolvedValue(null);
      const req = mockRequest(testUser, { id: slideId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('delete', '/:id')[1].handle;
      await handler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
