import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

const mockObjectIdString = () => new mongoose.Types.ObjectId().toHexString();
const mockObjectId = () => new mongoose.Types.ObjectId();

// This is used by tests directly, so it's fine here.
const mockSlideDocumentForTests = (id?: mongoose.Types.ObjectId | string, data?: Partial<any>): any => ({
  _id: id || mockObjectId(),
  name: 'Test Slide',
  type: 'image',
  data: { url: 'http://example.com/image.png' },
  ...data,
});

const mockSlideshowDocument = (data: any): any => {
  const docId = data._id || mockObjectId();
  const document = {
    ...data,
    _id: docId,
    id: docId.toString(),
    name: data.name || 'Mocked Slideshow',
    creator_id: data.creator_id || mockObjectIdString(),
    slides: data.slides || [],
    save: jest.fn(),
    populate: jest.fn(),
    execPopulate: jest.fn(),
  };
  document.save.mockResolvedValue(document);
  document.populate.mockImplementation(function(this: any, populatePath: string) {
    if (populatePath === 'slides') {
      return Promise.resolve({
        ...this,
        slides: this.slides.map((w:any) => (typeof w === 'string' || w instanceof mongoose.Types.ObjectId ? {_id:w, name:"Populated Slide From Instance"} : w ))
      });
    }
    return Promise.resolve(this);
  });
  document.execPopulate.mockResolvedValue(document);
  return document;
};

jest.mock('../../../api/models/Slideshow', () => {
  const MockedSlideshowConstructor = jest.fn().mockImplementation(data => mockSlideshowDocument(data));
  MockedSlideshowConstructor.findOne = jest.fn();
  MockedSlideshowConstructor.find = jest.fn();
  MockedSlideshowConstructor.findByIdAndDelete = jest.fn();
  return { __esModule: true, default: MockedSlideshowConstructor };
});
jest.mock('../../../api/models/Slide');


// Mock helpers
import * as slideshowHelper from '../../../api/helpers/slideshow_helper';
jest.mock('../../../api/helpers/slideshow_helper', () => {
    // Define helper for mock factory *inside* or make it so simple it doesn't use out-of-scope vars
    const mockSlideDataInFactory = (id?: any) => ({
      _id: id || `mockGeneratedId-${Math.random()}`, // Simple string ID
      name: 'Populated Slide from Helper Mock'
    });
    return {
        __esModule: true,
        validateSlidesExist: jest.fn().mockResolvedValue(true),
        reorderSlidesInSlideshow: jest.fn(ss => Promise.resolve(ss)),
        populateSlideshowSlides: jest.fn(ss => {
            if (!ss) return Promise.resolve(null);
            // Manually construct to avoid __assign or other transpiled helpers
            const populated = {
                _id: ss._id,
                name: ss.name,
                description: ss.description,
                is_enabled: ss.is_enabled,
                creator_id: ss.creator_id,
                creation_date: ss.creation_date,
                last_update: ss.last_update,
                // Ensure slides is an array before mapping
                slides: Array.isArray(ss.slides) ? ss.slides.map((sId: any) => mockSlideDataInFactory(sId)) : []
            };
            return Promise.resolve(populated);
        }),
    };
});

import slideshowRouter from '../../../api/routes/slideshow';
import Slideshow from '../../../api/models/Slideshow'; // Mocked version

const mockRequest = (user?: any, params?: any, body?: any): Partial<Request> => ({
  user,
  params,
  body,
  isAuthenticated: user ? jest.fn(() => true) : jest.fn(() => false),
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn() as NextFunction;

describe('/api/routes/slideshow.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testUser = { _id: mockObjectIdString(), username: 'testuser' };

  const getRouteHandlerStack = (method: 'get' | 'post' | 'put' | 'delete', path: string) => {
    const routeLayer = slideshowRouter.stack.find(
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
    it('should return slideshows with populated slides for authenticated user', async () => {
      const req = mockRequest(testUser) as Request;
      const res = mockResponse() as Response;
      const mockSlideshows = [mockSlideshowDocument({ name: 'SS1', slides: [mockObjectId()] })];
      // The populate mock on Slideshow.find should handle the structure
      const populatedSlideshows = mockSlideshows.map(ss => ({...ss, slides: ss.slides.map((s:any) => mockSlideDocumentForTests(s))}));

      const queryMock = { populate: jest.fn().mockResolvedValue(populatedSlideshows) };
      (Slideshow.find as jest.Mock).mockReturnValue(queryMock);

      const handler = getRouteHandlerStack('get', '/')[1].handle;
      await handler(req, res, mockNext);

      expect(Slideshow.find).toHaveBeenCalledWith({ creator_id: testUser._id });
      expect(queryMock.populate).toHaveBeenCalledWith('slides');
      expect(res.json).toHaveBeenCalledWith(populatedSlideshows);
    });
  });

  describe('GET /:id', () => {
    it('should return a specific slideshow with populated slides', async () => {
      const slideshowId = mockObjectIdString();
      const mockDoc = mockSlideshowDocument({ _id: slideshowId, creator_id: testUser._id, slides: [mockObjectId()] });
      const populatedDoc = {...mockDoc, slides: mockDoc.slides.map((s:any) => mockSlideDocumentForTests(s))};

      const queryMock = { populate: jest.fn().mockResolvedValue(populatedDoc) };
      (Slideshow.findOne as jest.Mock).mockReturnValue(queryMock);

      const req = mockRequest(testUser, { id: slideshowId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('get', '/:id')[1].handle;
      await handler(req, res, mockNext);

      expect(Slideshow.findOne).toHaveBeenCalledWith({ _id: slideshowId, creator_id: testUser._id });
      expect(queryMock.populate).toHaveBeenCalledWith('slides');
      expect(res.json).toHaveBeenCalledWith(populatedDoc);
    });
  });

  describe('POST /', () => {
    it('should create a new slideshow and return 201', async () => {
      const slideIds = [mockObjectIdString()];
      const slideshowData = { name: 'New Slideshow', slide_ids: slideIds };
      const savedSlideshowId = mockObjectId();
      const savedSlideshowInstance = mockSlideshowDocument({
          ...slideshowData,
          _id: savedSlideshowId,
          creator_id: testUser._id,
          slides: slideIds
      });

      (Slideshow as jest.Mock).mockImplementation(() => savedSlideshowInstance);
      // savedSlideshowInstance.save is mocked by mockSlideshowDocument
      // slideshowHelper.populateSlideshowSlides is mocked at the top

      const req = mockRequest(testUser, {}, slideshowData) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('post', '/')[1].handle;

      await handler(req, res, mockNext);

      expect(Slideshow).toHaveBeenCalledWith(expect.objectContaining({ name: slideshowData.name }));
      expect(savedSlideshowInstance.save).toHaveBeenCalled();
      expect(slideshowHelper.validateSlidesExist).toHaveBeenCalledWith(slideIds);
      expect(slideshowHelper.populateSlideshowSlides).toHaveBeenCalledWith(savedSlideshowInstance);
      expect(res.status).toHaveBeenCalledWith(201);
      const expectedPopulated = await slideshowHelper.populateSlideshowSlides(savedSlideshowInstance);
      expect(res.json).toHaveBeenCalledWith(expectedPopulated);
    });
  });

  describe('PUT /:id', () => {
    const slideshowId = mockObjectIdString();
    it('should update a slideshow (name and reorder) and return it', async () => {
      const updateData = { name: 'Updated Name', oldIndex: 0, newIndex: 1 };
      const initialSlides = [mockObjectId(), mockObjectId()];
      const existingSlideshow = mockSlideshowDocument({ _id: slideshowId, creator_id: testUser._id, slides: initialSlides });

      (Slideshow.findOne as jest.Mock).mockResolvedValue(existingSlideshow);
      // save on existingSlideshow is mocked by mockSlideshowDocument
      // reorderSlidesInSlideshow and populateSlideshowSlides helpers are mocked

      const req = mockRequest(testUser, { id: slideshowId }, updateData) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('put', '/:id')[1].handle;

      await handler(req, res, mockNext);

      expect(Slideshow.findOne).toHaveBeenCalledWith({ _id: slideshowId, creator_id: testUser._id });
      expect(slideshowHelper.reorderSlidesInSlideshow).toHaveBeenCalledWith(existingSlideshow, updateData.oldIndex, updateData.newIndex);
      expect(existingSlideshow.save).toHaveBeenCalled();
      expect(slideshowHelper.populateSlideshowSlides).toHaveBeenCalled();
      const expectedPopulated = await slideshowHelper.populateSlideshowSlides(existingSlideshow);
      expect(res.json).toHaveBeenCalledWith(expectedPopulated);
    });
  });

  describe('DELETE /:id', () => {
    const slideshowId = mockObjectIdString();
    it('should delete a slideshow', async () => {
      const slideshowToDelete = mockSlideshowDocument({ _id: slideshowId, creator_id: testUser._id });
      (Slideshow.findOne as jest.Mock).mockResolvedValue(slideshowToDelete);
      (Slideshow.findByIdAndDelete as jest.Mock).mockResolvedValue(slideshowToDelete);

      const req = mockRequest(testUser, { id: slideshowId }) as Request;
      const res = mockResponse() as Response;
      const handler = getRouteHandlerStack('delete', '/:id')[1].handle;

      await handler(req, res, mockNext);
      expect(Slideshow.findOne).toHaveBeenCalledWith({ _id: slideshowId, creator_id: testUser._id });
      expect(Slideshow.findByIdAndDelete).toHaveBeenCalledWith(slideshowId);
      expect(res.json).toHaveBeenCalledWith({ message: 'Slideshow deleted successfully' });
    });
  });
});
