import express from 'express'; // Actual import for type checking

// Mock the sub-routers that are actually used
jest.mock('../../../api/routes/display', () => jest.fn());
jest.mock('../../../api/routes/slide', () => jest.fn());
jest.mock('../../../api/routes/slideshow', () => jest.fn());
jest.mock('../../../api/routes/user', () => jest.fn());
jest.mock('../../../api/routes/widgets', () => jest.fn());

// Define spies for router methods
const mockRouterGet = jest.fn();
const mockRouterUse = jest.fn();

// This is the instance that express.Router() will return
const mockRouterInstance = {
  get: mockRouterGet,
  use: mockRouterUse,
};

// Mock express
jest.mock('express', () => ({
  Router: jest.fn(() => mockRouterInstance),
}));

// Declare indexRouter here, will be assigned in beforeEach
let indexRouter: any;

describe('Index Router', () => {
  beforeEach(() => {
    jest.resetModules();

    mockRouterGet.mockClear();
    mockRouterUse.mockClear();

    const ActualExpressMock = jest.requireMock('express');
    (ActualExpressMock.Router as jest.Mock).mockClear();

    // Import the router from index.ts AFTER mocks are set up and modules are reset
    indexRouter = require('../../../api/routes/index').default;
  });

  test('should create one router instance', () => {
    const ActualExpressMock = jest.requireMock('express');
    expect(ActualExpressMock.Router).toHaveBeenCalledTimes(1);
  });

  test('should set up a health check route at /', () => {
    expect(mockRouterGet).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('health check route should respond with JSON message and version', () => {
    expect(mockRouterGet).toHaveBeenCalledWith('/', expect.any(Function));
    const healthCheckHandler = mockRouterGet.mock.calls.find(call => call[0] === '/')[1];

    const mockReq = {};
    const mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    healthCheckHandler(mockReq, mockRes);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'API is working!',
      version: 'v1'
    });
  });

  test('should use all sub-routers with correct paths', () => {
    // Re-require the mocked routes to ensure we have the exact instances
    // that were imported by api/routes/index.ts after jest.resetModules()
    const displayRoutesMock = jest.requireMock('../../../api/routes/display');
    const slideRoutesMock = jest.requireMock('../../../api/routes/slide');
    const slideshowRoutesMock = jest.requireMock('../../../api/routes/slideshow');
    const userRoutesMock = jest.requireMock('../../../api/routes/user');
    const widgetRoutesMock = jest.requireMock('../../../api/routes/widgets');

    expect(mockRouterUse).toHaveBeenCalledWith('/displays', displayRoutesMock);
    expect(mockRouterUse).toHaveBeenCalledWith('/slides', slideRoutesMock);
    expect(mockRouterUse).toHaveBeenCalledWith('/slideshows', slideshowRoutesMock);
    expect(mockRouterUse).toHaveBeenCalledWith('/users', userRoutesMock);
    expect(mockRouterUse).toHaveBeenCalledWith('/widgets', widgetRoutesMock);
  });
});
