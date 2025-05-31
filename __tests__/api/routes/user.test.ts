import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import passport from 'passport';
import User, { IUser } from '../../../api/models/User';
import userRouter from '../../../api/routes/user';

jest.mock('passport', () => ({
  authenticate: jest.fn(),
  initialize: jest.fn(() => (req: any, res: any, next: any) => next()),
  session: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

const mockObjectIdString = () => new mongoose.Types.ObjectId().toHexString();
const mockObjectId = () => new mongoose.Types.ObjectId();

const mockUserDocument = (data: any): any => {
  const docId = data && data._id ? data._id : mockObjectId();
  const document = {
    ...data,
    _id: docId,
    id: docId.toString(),
    email: (data && data.email) ? data.email : 'test@example.com',
    name: (data && data.name) ? data.name : 'Test User',
    role: (data && data.role) ? data.role : 'user',
    save: jest.fn(),
    populate: jest.fn().mockReturnThis(),
    execPopulate: jest.fn(),
  };
  document.save.mockResolvedValue(document);
  document.populate.mockImplementation(function(this: any, populatePath: string) {
    if (populatePath === 'widgets' || populatePath === 'slides') { // Generalizing for potential use
      return Promise.resolve({
        ...this,
        [populatePath]: this[populatePath].map((item:any) => (typeof item === 'string' || item instanceof mongoose.Types.ObjectId ? {_id:item, name:`Populated ${populatePath}`} : item ))
      });
    }
    return Promise.resolve(this);
  });
  document.execPopulate.mockResolvedValue(document);
  return document;
};

jest.mock('../../../api/models/User', () => {
  const MockedUserConstructor = jest.fn().mockImplementation(data => {
    const id = (data && data._id) ? data._id.toString() : `mock-user-id-${Math.random().toString(36).substring(7)}`;
    const internalUserDoc: any = {};
    if(data) {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                internalUserDoc[key] = data[key];
            }
        }
    }
    internalUserDoc._id = id;
    internalUserDoc.email = (data && data.email) ? data.email : 'factory.mock@example.com';
    internalUserDoc.name = (data && data.name) ? data.name : 'Factory Mocked User';
    internalUserDoc.role = (data && data.role) ? data.role : 'user';
    internalUserDoc.save = jest.fn().mockResolvedValue(internalUserDoc); // Add save mock
    return internalUserDoc;
  });
  MockedUserConstructor.register = jest.fn();
  return {
    __esModule: true,
    default: MockedUserConstructor,
  };
});

const mockRequest = (body?: any, user?: any, session?: any): Partial<Request> => {
  const req: Partial<Request> = {
    body: body || {},
    user: user,
    login: jest.fn((usr, cb) => { if(cb) cb(); return Promise.resolve(); }),
    logout: jest.fn((cb) => { if (cb) cb(); }),
    isAuthenticated: jest.fn(() => !!user),
    session: session || { destroy: jest.fn(cb => cb()) },
  };
  return req;
};

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn() as NextFunction;

describe('/api/routes/user.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testUser = mockUserDocument({
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  });

  const getRouteHandlerStack = (method: 'get' | 'post', path: string) => {
    const routeLayer = userRouter.stack.find(
      (r) => r.route && r.route.path === path && r.route.methods[method]
    );
    if (!routeLayer || !routeLayer.route || !routeLayer.route.stack[0]) {
      throw new Error(`Route ${method.toUpperCase()} ${path} not found or has no handler`);
    }
    return routeLayer.route.stack;
  };

  describe('POST /register', () => {
    const registerHandler = getRouteHandlerStack('post', '/register')[0].handle;

    it('should register and login a new user successfully', async () => {
      const reqBody = { email: 'new@example.com', password: 'password', name: 'New User' };
      const req = mockRequest(reqBody) as Request;
      const res = mockResponse() as Response;
      const registeredUserDoc = mockUserDocument({ email: reqBody.email, name: reqBody.name });

      (User.register as jest.Mock).mockImplementation((userInstanceData, password, cb) => {
        cb(null, registeredUserDoc);
      });
      (req.login as jest.Mock).mockImplementation((user, cb) => cb());

      await registerHandler(req, res, mockNext);

      expect(User.register).toHaveBeenCalled();
      expect(req.login).toHaveBeenCalledWith(registeredUserDoc, expect.any(Function));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User registered and logged in successfully',
        user: expect.objectContaining({ email: registeredUserDoc.email, name: registeredUserDoc.name }),
      }));
    });

    it('should return 400 if email or password is not provided', async () => {
        const req = mockRequest({ email: 'test@example.com' }) as Request;
        const res = mockResponse() as Response;
        await registerHandler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Username (email) and password are required.' });
    });

    it('should return 500 if User.register calls back with an error', async () => {
        const req = mockRequest({ email: 'test@example.com', password: 'password' }) as Request;
        const res = mockResponse() as Response;
        const registerError = new Error("Registration DB error");
        (User.register as jest.Mock).mockImplementation((user, password, cb) => cb(registerError));

        await registerHandler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error registering user', error: registerError.message });
    });

    it('should return 500 if User.register calls back without user (safeguard)', async () => {
      const req = mockRequest({ email: 'test@example.com', password: 'password' }) as Request;
      const res = mockResponse() as Response;
      (User.register as jest.Mock).mockImplementation((user, password, cb) => cb(null, undefined));

      await registerHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'User registration failed, user object not returned.' });
    });

    it('should return 500 if req.login calls back with an error after registration', async () => {
        const req = mockRequest({ email: 'test@example.com', password: 'password' }) as Request;
        const res = mockResponse() as Response;
        const loginError = new Error("Login after reg error");
        (User.register as jest.Mock).mockImplementation((user, password, cb) => cb(null, testUser));
        (req.login as jest.Mock).mockImplementation((user, cb) => cb(loginError));

        await registerHandler(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error logging in user after registration', error: loginError.message });
    });
  });

  describe('POST /login', () => {
    const loginHandler = getRouteHandlerStack('post', '/login')[0].handle;

    it('should login user successfully', async () => {
      const req = mockRequest({ username: testUser.email, password: 'password' }) as Request;
      const res = mockResponse() as Response;

      (passport.authenticate as jest.Mock).mockImplementation((strategy, callback) => {
        return (reqInner: Request, resInner: Response, nextInner: NextFunction) => {
          callback(null, testUser, null);
        };
      });
      (req.login as jest.Mock).mockImplementation((user, cb) => cb());

      await loginHandler(req, res, mockNext);

      expect(passport.authenticate).toHaveBeenCalledWith('local', expect.any(Function));
      expect(req.login).toHaveBeenCalledWith(testUser, expect.any(Function));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Login successful',
        user: expect.objectContaining({ email: testUser.email }),
      }));
    });

    it('should return 401 for failed login (no user, with info message)', async () => {
      const req = mockRequest({ username: 'wrong@example.com', password: 'password' }) as Request;
      const res = mockResponse() as Response;
      (passport.authenticate as jest.Mock).mockImplementation((strategy, callback) => {
        return (reqInner: Request, resInner: Response, nextInner: NextFunction) => {
          callback(null, false, { message: 'Incorrect username.' });
        };
      });
      await loginHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Incorrect username.' });
    });

    it('should return 500 for passport error during authenticate', async () => {
      const req = mockRequest({ username: 'test@example.com', password: 'password' }) as Request;
      const res = mockResponse() as Response;
      const authError = new Error("Passport explosion");
      (passport.authenticate as jest.Mock).mockImplementation((strategy, callback) => {
        return (reqInner: Request, resInner: Response, nextInner: NextFunction) => {
          callback(authError, false, null);
        };
      });
      await loginHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error during login', error: authError.message });
    });

    it('should return 500 if req.login calls back with an error after authentication', async () => {
      const req = mockRequest({ username: testUser.email, password: 'password' }) as Request;
      const res = mockResponse() as Response;
      const loginError = new Error("req.login failed");
      (passport.authenticate as jest.Mock).mockImplementation((strategy, callback) => {
        return (reqInner: Request, resInner: Response, nextInner: NextFunction) => {
          callback(null, testUser, null);
        };
      });
      (req.login as jest.Mock).mockImplementation((user, cb) => cb(loginError));

      await loginHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error establishing login session', error: loginError.message });
    });
  });

  describe('GET /logout', () => {
    const logoutHandler = getRouteHandlerStack('get', '/logout')[0].handle;
    it('should logout user successfully', async () => {
      const req = mockRequest({}, testUser) as Request;
      const res = mockResponse() as Response;

      await logoutHandler(req, res, mockNext);

      expect(req.logout).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Logout successful' });
    });

    it('should return 500 if req.logout calls back with an error', async () => {
      const req = mockRequest({}, testUser) as Request;
      const res = mockResponse() as Response;
      const logoutError = new Error("Logout failed");
      (req.logout as jest.Mock).mockImplementation((cb) => cb(logoutError));

      await logoutHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error logging out', error: logoutError.message });
    });
     it('should return 500 if req.logout is not available (less likely)', async () => {
      const req = mockRequest({}, testUser) as Request;
      delete (req as any).logout; // Simulate logout not being available
      const res = mockResponse() as Response;

      await logoutHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logout feature not available.' });
    });
  });

  describe('GET /me', () => {
    const meHandler = getRouteHandlerStack('get', '/me')[0].handle;
    it('should return current user if authenticated', async () => {
      const req = mockRequest(undefined, testUser) as Request;
      (req.isAuthenticated as jest.Mock).mockReturnValue(true);
      const res = mockResponse() as Response;

      await meHandler(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: testUser.email, name: testUser.name, role: testUser.role }));
    });

    it('should return 401 if not authenticated', async () => {
      const req = mockRequest() as Request;
      (req.isAuthenticated as jest.Mock).mockReturnValue(false);
      const res = mockResponse() as Response;

      await meHandler(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    });
  });
});
