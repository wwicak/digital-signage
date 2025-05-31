import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport'; // For req.user, req.isAuthenticated type usage
import WidgetsRouter from '../../../api/routes/widgets';
import Widget, { IWidget, WidgetType } from '../../../api/models/Widget'; // Actual Widget model
import User, { IUser } from '../../../api/models/User'; // For req.user type
import * as widgetHelper from '../../../api/helpers/widget_helper';

// Mock dependencies
jest.mock('../../../api/models/User');
jest.mock('passport');

// Mock helper functions from widget_helper
jest.mock('../../../api/helpers/widget_helper');

const mockUser = { _id: 'testUserId', name: 'Test User', email: 'test@example.com', role: 'user' } as IUser;

// Helper function to create a mock Mongoose query chain
const mockQueryChain = (resolveValue: any = null) => {
  const query: any = {
    // populate: jest.fn().mockReturnThis(), // Not typically used in widget routes directly
    // select: jest.fn().mockReturnThis(),   // Not typically used in widget routes directly
    exec: jest.fn().mockResolvedValue(resolveValue)
  };
  return query;
};

describe('Widget API Routes', () => {
  let app: Express;

  // Spies for model methods
  let widgetFindSpy: jest.SpyInstance;
  let widgetFindOneSpy: jest.SpyInstance;
  let widgetProtoSaveSpy: jest.SpyInstance;
  // findByIdAndDelete is part of the deleteWidgetAndCleanReferences helper, which is mocked

  // Mocks for helper functions
  const mockedValidateWidgetData = widgetHelper.validateWidgetData as jest.Mock;
  const mockedDeleteWidgetAndCleanReferences = widgetHelper.deleteWidgetAndCleanReferences as jest.Mock;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'jest-test-secret', resave: false, saveUninitialized: false }));

    app.use((req: any, res: Response, next: NextFunction) => {
      req.user = mockUser;
      req.isAuthenticated = () => true;
      req.login = jest.fn((user, cb) => cb(null));
      req.logout = jest.fn((cb) => cb(null));
      next();
    });

    app.use('/api/v1/widgets', WidgetsRouter); // Mount the router

    // Setup spies on Widget model methods
    widgetFindSpy = jest.spyOn(Widget, 'find');
    widgetFindOneSpy = jest.spyOn(Widget, 'findOne');
    widgetProtoSaveSpy = jest.spyOn(Widget.prototype, 'save');
    // Note: findByIdAndDelete is not directly spied on if it's only called within the mocked deleteWidgetAndCleanReferences

    // Reset helper mocks
    mockedValidateWidgetData.mockReset();
    mockedDeleteWidgetAndCleanReferences.mockReset();

    widgetFindSpy.mockImplementation(() => mockQueryChain([]));
    widgetFindOneSpy.mockImplementation(() => mockQueryChain(null));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /', () => {
    it('should fetch all widgets for the logged-in user', async () => {
      const mockWidgets = [
        { _id: 'widget1', name: 'Widget 1', creator_id: mockUser._id, type: WidgetType.ANNOUNCEMENT, data: {} },
        { _id: 'widget2', name: 'Widget 2', creator_id: mockUser._id, type: WidgetType.WEATHER, data: {} },
      ];
      widgetFindSpy.mockImplementation(() => mockQueryChain(mockWidgets));

      const response = await request(app).get('/api/v1/widgets');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockWidgets);
      expect(widgetFindSpy).toHaveBeenCalledWith({ creator_id: mockUser._id });
      const findSpyResult = widgetFindSpy.mock.results[0].value;
      expect(findSpyResult.exec).toHaveBeenCalled();
    });

    it('should return 400 if user information is not found', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use('/api/v1/widgets', WidgetsRouter);

      const response = await request(tempApp).get('/api/v1/widgets');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User information not found.');
    });

    it('should return 500 if fetching widgets fails', async () => {
      widgetFindSpy.mockImplementation(() => mockQueryChain(null).exec.mockRejectedValue(new Error('DB error')).getMockImplementation()());
      const response = await request(app).get('/api/v1/widgets');
      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Error fetching widgets');
    });
  });

  describe('GET /:id', () => {
    const widgetId = 'testWidgetId';
    it('should fetch a specific widget successfully', async () => {
        const mockWidget = { _id: widgetId, name: 'Test Widget', type: WidgetType.ANNOUNCEMENT, data: {}, creator_id: mockUser._id };
        widgetFindOneSpy.mockImplementation(() => mockQueryChain(mockWidget));

        const response = await request(app).get(`/api/v1/widgets/${widgetId}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockWidget);
        expect(widgetFindOneSpy).toHaveBeenCalledWith({ _id: widgetId, creator_id: mockUser._id });
        const findOneSpyResult = widgetFindOneSpy.mock.results[0].value;
        expect(findOneSpyResult.exec).toHaveBeenCalled();
    });

    it('should return 404 if widget not found', async () => {
        widgetFindOneSpy.mockImplementation(() => mockQueryChain(null));
        const response = await request(app).get(`/api/v1/widgets/nonexistent`);
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Widget not found or not authorized.');
    });

    it('should return 500 on database error', async () => {
        widgetFindOneSpy.mockImplementation(() => mockQueryChain(null).exec.mockRejectedValue(new Error('DB error')).getMockImplementation()());
        const response = await request(app).get(`/api/v1/widgets/${widgetId}`);
        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Error fetching widget.');
    });

    it('should return 400 if user information is not found for GET /:id', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use('/api/v1/widgets', WidgetsRouter);

      const response = await request(tempApp).get(`/api/v1/widgets/${widgetId}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User information not found.');
    });
  });

  describe('POST /', () => {
    const newWidgetData = {
      name: 'New Widget',
      type: WidgetType.LIST,
      data: { items: ["item1", "item2"] },
      x: 0, y: 0, w: 2, h: 2
    };
    const savedWidgetMock = { ...newWidgetData, _id: 'newWidgetId', creator_id: mockUser._id };

    it('should create a new widget successfully', async () => {
      mockedValidateWidgetData.mockResolvedValue(undefined); // Assume validation passes
      widgetProtoSaveSpy.mockResolvedValue(savedWidgetMock as any);

      const response = await request(app)
        .post('/api/v1/widgets')
        .send(newWidgetData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(savedWidgetMock);
      expect(mockedValidateWidgetData).toHaveBeenCalledWith(newWidgetData.type, newWidgetData.data);
      expect(widgetProtoSaveSpy).toHaveBeenCalledTimes(1);
      const savedObject = widgetProtoSaveSpy.mock.calls[0][0];
      expect(savedObject.name).toBe(newWidgetData.name);
      expect(savedObject.type).toBe(newWidgetData.type);
      expect(savedObject.data).toEqual(newWidgetData.data);
      expect(savedObject.x).toBe(0); // Default if not provided, or provided value
      expect(savedObject.y).toBe(0);
      expect(savedObject.w).toBe(2);
      expect(savedObject.h).toBe(2);
    });

    it('should return 400 if name is missing', async () => {
      const { name, ...dataWithoutName } = newWidgetData;
      const response = await request(app)
        .post('/api/v1/widgets')
        .send(dataWithoutName);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Widget name and type are required.');
    });

    it('should return 400 if type is missing', async () => {
      const { type, ...dataWithoutType } = newWidgetData;
      const response = await request(app)
        .post('/api/v1/widgets')
        .send(dataWithoutType);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Widget name and type are required.');
    });

    it('should return 400 if validateWidgetData throws an error', async () => {
      mockedValidateWidgetData.mockRejectedValue(new Error('Invalid data for widget type'));
      const response = await request(app)
        .post('/api/v1/widgets')
        .send(newWidgetData);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid data for widget type');
    });

    it('should handle Mongoose ValidationError on save', async () => {
      mockedValidateWidgetData.mockResolvedValue(undefined);
      const validationError = new Error('Validation failed') as any;
      validationError.name = 'ValidationError';
      widgetProtoSaveSpy.mockRejectedValue(validationError); // Corrected to widgetProtoSaveSpy

      const response = await request(app)
        .post('/api/v1/widgets')
        .send(newWidgetData);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation Error');
    });

    it('should handle other database errors on save', async () => {
      mockedValidateWidgetData.mockResolvedValue(undefined);
      widgetProtoSaveSpy.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/v1/widgets')
        .send(newWidgetData);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error creating widget');
    });

     it('should apply default layout values (x,y,w,h) if not provided', async () => {
      const { x,y,w,h, ...dataWithoutLayout } = newWidgetData;
      const savedWidgetWithDefaults = {
        ...dataWithoutLayout,
        _id: 'widgetWithDefaults',
        creator_id: mockUser._id,
        x: 0, y: 0, w: 1, h: 1 // Default values from schema/route
      };
      mockedValidateWidgetData.mockResolvedValue(undefined);
      widgetProtoSaveSpy.mockResolvedValue(savedWidgetWithDefaults as any);

      const response = await request(app)
        .post('/api/v1/widgets')
        .send(dataWithoutLayout);

      expect(response.status).toBe(201);
      expect(response.body.x).toBe(0);
      expect(response.body.y).toBe(0);
      expect(response.body.w).toBe(1);
      expect(response.body.h).toBe(1);
      const savedObject = widgetProtoSaveSpy.mock.calls[0][0];
      expect(savedObject.x).toBe(0);
      expect(savedObject.y).toBe(0);
      expect(savedObject.w).toBe(1);
      expect(savedObject.h).toBe(1);
    });

    it('should return 400 if user information is not found for POST /', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use('/api/v1/widgets', WidgetsRouter);

      const response = await request(tempApp).post('/api/v1/widgets').send(newWidgetData);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User information not found.');
    });
  });

  describe('PUT /:id', () => {
    const widgetId = 'existingWidgetId';
    const getInitialWidget = () => ({
      _id: widgetId,
      name: 'Initial Widget',
      type: WidgetType.ANNOUNCEMENT,
      data: { text: "Hello" },
      creator_id: mockUser._id,
      save: jest.fn(),
    });
    const updatePayload = { name: 'Updated Widget Name', data: { text: "World" } };

    it('should update widget details successfully', async () => {
      const currentWidgetState = getInitialWidget();
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(currentWidgetState));
      currentWidgetState.save.mockResolvedValue({ ...currentWidgetState, ...updatePayload });
      mockedValidateWidgetData.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/v1/widgets/${widgetId}`)
        .send(updatePayload);

      expect(response.status).toBe(200);
      expect(widgetFindOneSpy.mock.results[0].value.exec).toHaveBeenCalled();
      expect(currentWidgetState.save).toHaveBeenCalledTimes(1);
      expect(response.body.name).toBe(updatePayload.name);
      expect(response.body.data).toEqual(updatePayload.data);
      // Validate that validateWidgetData was called with the correct type and new data
      expect(mockedValidateWidgetData).toHaveBeenCalledWith(currentWidgetState.type, updatePayload.data);
    });

    it('should update widget type and data successfully', async () => {
      const currentWidgetState = getInitialWidget();
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(currentWidgetState));
      const typeUpdatePayload = { type: WidgetType.LIST, data: { items: ["New list"] } };
      currentWidgetState.save.mockResolvedValue({ ...currentWidgetState, ...typeUpdatePayload });
      mockedValidateWidgetData.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/v1/widgets/${widgetId}`)
        .send(typeUpdatePayload);

      expect(response.status).toBe(200);
      expect(response.body.type).toBe(typeUpdatePayload.type);
      expect(response.body.data).toEqual(typeUpdatePayload.data);
      expect(mockedValidateWidgetData).toHaveBeenCalledWith(typeUpdatePayload.type, typeUpdatePayload.data);
    });

    it('should call validateWidgetData with existing type if only data is updated', async () => {
      const currentWidgetState = getInitialWidget();
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(currentWidgetState));
      const dataOnlyUpdate = { data: { text: "Only data updated" } };
      currentWidgetState.save.mockResolvedValue({ ...currentWidgetState, ...dataOnlyUpdate });
      mockedValidateWidgetData.mockResolvedValue(undefined);

      await request(app).put(`/api/v1/widgets/${widgetId}`).send(dataOnlyUpdate);
      expect(mockedValidateWidgetData).toHaveBeenCalledWith(currentWidgetState.type, dataOnlyUpdate.data);
    });

    it('should call validateWidgetData with existing data if only type is updated', async () => {
      const currentWidgetState = getInitialWidget();
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(currentWidgetState));
      const typeOnlyUpdate = { type: WidgetType.WEATHER };
      currentWidgetState.save.mockResolvedValue({ ...currentWidgetState, ...typeOnlyUpdate });
      mockedValidateWidgetData.mockResolvedValue(undefined);

      await request(app).put(`/api/v1/widgets/${widgetId}`).send(typeOnlyUpdate);
      expect(mockedValidateWidgetData).toHaveBeenCalledWith(typeOnlyUpdate.type, currentWidgetState.data);
    });


    it('should return 404 if widget to update is not found', async () => {
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(null));
      const response = await request(app)
        .put(`/api/v1/widgets/nonExistentId`)
        .send(updatePayload);
      expect(response.status).toBe(404);
    });

    it('should return 400 if validateWidgetData throws an error during update', async () => {
      const currentWidgetState = getInitialWidget();
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(currentWidgetState));
      mockedValidateWidgetData.mockRejectedValue(new Error('Invalid data for update'));
      const response = await request(app)
        .put(`/api/v1/widgets/${widgetId}`)
        .send(updatePayload);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid data for update');
    });

    it('should return 400 on Mongoose ValidationError during update', async () => {
      const currentWidgetState = getInitialWidget();
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(currentWidgetState));
      const validationError = new Error('Validation failed') as any;
      validationError.name = 'ValidationError';
      currentWidgetState.save.mockRejectedValue(validationError);
       mockedValidateWidgetData.mockResolvedValue(undefined);


      const response = await request(app)
        .put(`/api/v1/widgets/${widgetId}`)
        .send(updatePayload);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Validation Error');
    });

    it('should return 500 on other database errors during update', async () => {
      const currentWidgetState = getInitialWidget();
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(currentWidgetState));
      currentWidgetState.save.mockRejectedValue(new Error('DB save error'));
      mockedValidateWidgetData.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/v1/widgets/${widgetId}`)
        .send(updatePayload);
      expect(response.status).toBe(500);
    });

    it('should return 400 if user information is not found for PUT /:id', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use('/api/v1/widgets', WidgetsRouter);

      const response = await request(tempApp).put(`/api/v1/widgets/${widgetId}`).send(updatePayload);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User information not found.');
    });
  });

  describe('DELETE /:id', () => {
    const widgetId = 'widgetToDelete';
    const mockWidgetInstance = {
      _id: widgetId,
      name: 'Test Widget',
      creator_id: mockUser._id,
      type: WidgetType.ANNOUNCEMENT
    };

    it('should delete a widget successfully', async () => {
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(mockWidgetInstance));
      mockedDeleteWidgetAndCleanReferences.mockResolvedValue(mockWidgetInstance as any);

      const response = await request(app)
        .delete(`/api/v1/widgets/${widgetId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Widget deleted successfully and removed from displays');
      expect(widgetFindOneSpy.mock.results[0].value.exec).toHaveBeenCalled();
      expect(mockedDeleteWidgetAndCleanReferences).toHaveBeenCalledWith(widgetId);
    });

    it('should return 404 if widget to delete is not found by findOne', async () => {
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(null));
      const response = await request(app)
        .delete(`/api/v1/widgets/nonExistentId`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Widget not found or not authorized');
      expect(mockedDeleteWidgetAndCleanReferences).not.toHaveBeenCalled();
    });

    it('should return 404 if deleteWidgetAndCleanReferences does not return a widget', async () => {
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(mockWidgetInstance));
      mockedDeleteWidgetAndCleanReferences.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/v1/widgets/${widgetId}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Widget not found during deletion process.');
    });

    it('should return 500 if findOne throws an error during delete', async () => {
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(null).exec.mockRejectedValue(new Error('DB find error')).getMockImplementation()());
      const response = await request(app)
        .delete(`/api/v1/widgets/${widgetId}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error deleting widget');
    });

    it('should return 500 if deleteWidgetAndCleanReferences helper throws an error', async () => {
      widgetFindOneSpy.mockImplementation(() => mockQueryChain(mockWidgetInstance));
      mockedDeleteWidgetAndCleanReferences.mockRejectedValue(new Error('Helper error'));
      const response = await request(app)
        .delete(`/api/v1/widgets/${widgetId}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error deleting widget');
    });

    it('should return 400 if user information is not found for DELETE /:id', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = () => true;
        next();
      });
      tempApp.use('/api/v1/widgets', WidgetsRouter);

      const response = await request(tempApp).delete(`/api/v1/widgets/${widgetId}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User information not found.');
    });
  });
});
