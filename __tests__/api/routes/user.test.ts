import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import session from 'express-session'; // express-session is a peer dependency of passport
import UserRouter from '../../../api/routes/user';
import User, { IUser } from '../../../api/models/User'; // Actual User model
// Removed duplicate imports of passport, express, session, UserRouter

// Mock only passport
jest.mock('passport');

const mockPassportAuthenticate = passport.authenticate as jest.Mock;
let mockUserRegister: jest.SpyInstance;

describe('User API Routes - Registration', () => {
  let app: Express;

  beforeEach(() => {
    // Spy on User.register before each test and restore it afterwards
    // User.register is a static method, so we spy on the class itself.
    // Important: passport-local-mongoose adds 'register' to the User model directly.
    mockUserRegister = jest.spyOn(User, 'register' as any); // 'as any' because TS might not know about 'register' on the static side initially
    mockUserRegister.mockClear(); // Ensure clear before each test

    (passport.authenticate as jest.Mock).mockReset();


    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));

    (passport.initialize as jest.Mock).mockImplementation(() => (req: Request, res: Response, next: NextFunction) => next());
    (passport.session as jest.Mock).mockImplementation(() => (req: Request, res: Response, next: NextFunction) => next());

    app.use((req: any, res: Response, next: NextFunction) => {
      req.login = jest.fn((user, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
        }
        if (callback) {
          // Simulate successful login by calling the callback without an error
          // and setting req.user
          req.user = user;
          return callback(null);
        }
        // If no callback, it's a more complex scenario, but for most tests, callback is used.
      });
      req.logout = jest.fn((options, callback) => {
         if (typeof options === 'function') {
          callback = options;
        }
        req.user = null; // Simulate logout
        if (callback) {
          return callback(null);
        }
      });
      req.isAuthenticated = jest.fn(() => !!req.user);
      next();
    });

    app.use('/user', UserRouter);

    // Reset passport.authenticate mock implementation for each test
    // This is a bit tricky as they are added per request.
    // However, since we are testing the router, the new app instance in beforeEach helps.
    // Also, clear any specific implementations set on passport.authenticate
    mockPassportAuthenticate.mockImplementation(() => (req: Request, res: Response, next: NextFunction) => {
      // Default mock implementation for passport.authenticate if needed,
      // otherwise tests will provide their own via mockImplementationOnce
      next();
    });
  });

  describe('POST /user/register', () => {
    const userData = { email: 'test@example.com', password: 'password123', name: 'Test User' };

    it('should register and login a new user successfully', async () => {
      const mockRegisteredUser = { // This is what User.register's callback will return
        _id: 'mockUserId',
        email: userData.email,
        name: userData.name,
        role: 'user',
        // passport-local-mongoose might add other fields, but these are primary for response
      } as IUser; // Cast to IUser, understanding it's a simplified mock for this context

      // Mock the implementation of User.register
      // The first argument `user` to User.register is an instance of User model with data.
      // The actual User model constructor will be called in the route.
      mockUserRegister.mockImplementation((userPayload: Partial<IUser>, password, callback) => {
        // userPayload here is the new User({ email, name }) instance created in the route
        // It should have email and name properties.
        // For the purpose of the mock, we just ensure the callback is called correctly.
        // We can also assert that userPayload contains expected data.
        expect(userPayload.email).toBe(userData.email);
        expect(userPayload.name).toBe(userData.name);
        callback(null, mockRegisteredUser);
      });

      const response = await request(app)
        .post('/user/register')
        .send(userData);

      expect(mockUserRegister).toHaveBeenCalledTimes(1);
      // userArgument (userPayload above) is checked inside mockImplementation
      expect(mockUserRegister.mock.calls[0][1]).toBe(userData.password); // Check password


      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered and logged in successfully');
      expect(response.body.user).toEqual({
        _id: mockRegisteredUser._id,
        email: mockRegisteredUser.email,
        name: mockRegisteredUser.name,
        role: mockRegisteredUser.role,
      });
      // Check that req.login was called (via the app.use middleware)
      // Supertest makes a real request, so the req.login on that actual request should be called.
      // Testing this requires a more intricate spy on req.login if it wasn't globally mocked,
      // but our global req.login mock should cover the fact that it *would* be called.
    });

    it('should return 400 if email is missing', async () => {
      const { email, ...dataWithoutEmail } = userData;
      const response = await request(app)
        .post('/user/register')
        .send(dataWithoutEmail);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Username (email) and password are required.');
      expect(mockUserRegister).not.toHaveBeenCalled();
    });

    it('should return 400 if password is missing', async () => {
      const { password, ...dataWithoutPassword } = userData;
      const response = await request(app)
        .post('/user/register')
        .send(dataWithoutPassword);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Username (email) and password are required.');
      expect(mockUserRegister).not.toHaveBeenCalled();
    });

    it('should return 500 if User.register calls back with an error', async () => {
      mockUserRegister.mockImplementation((user, password, callback) => {
        callback(new Error('DB registration error'));
      });

      const response = await request(app)
        .post('/user/register')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error registering user');
      expect(response.body.error).toBe('DB registration error');
    });

    it('should return 500 if User.register does not return a user (undefined)', async () => {
      mockUserRegister.mockImplementation((user, password, callback) => {
        callback(null, undefined);
      });

      const response = await request(app)
        .post('/user/register')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('User registration failed, user object not returned.');
    });

    it('should return 500 if req.login fails after registration', async () => {
      const mockRegisteredUser = { _id: 'mockUserId', email: userData.email, name: userData.name } as IUser;
      mockUserRegister.mockImplementation((user, password, callback) => {
        callback(null, mockRegisteredUser);
      });

      // Create a new app instance to override req.login for this specific test
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
      tempApp.use(passport.initialize()); // Not strictly necessary for this test but good practice
      tempApp.use(passport.session());   // Not strictly necessary for this test

      tempApp.use((req: any, res, next) => {
        // For this app instance, make req.login fail
        req.login = jest.fn((user, options, cb) => {
          if (typeof options === 'function') cb = options;
          cb(new Error("Simulated login error"));
        });
        req.logout = jest.fn(); // Keep other mocks if necessary
        req.isAuthenticated = jest.fn();
        next();
      });
      tempApp.use('/user', UserRouter); // Use the same router

      const response = await request(tempApp)
        .post('/user/register')
        .send(userData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error logging in user after registration');
      expect(response.body.error).toBe('Simulated login error');
    });
  });

  describe('POST /user/login', () => {
    const loginData = { email: 'test@example.com', password: 'password123' };

    it('should login an existing user successfully', async () => {
      const mockUser = { _id: 'mockUserId', email: loginData.email, name: 'Test User', role: 'user' } as IUser;

      // passport.authenticate will call its callback (the one we define in the route)
      // For a successful login, this callback will be called with (null, mockUser)
      // And then req.login will be called.
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        // This is the function that passport.authenticate returns, which is then called with (req,res,next)
        return (req: Request, res: Response, next: NextFunction) => {
          // Simulate passport finding the user and calling the route's callback
          callback(null, mockUser, null);
        };
      });

      const response = await request(app)
        .post('/user/login')
        .send(loginData);

      expect(passport.authenticate).toHaveBeenCalledWith('local', expect.any(Function));
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toEqual({
        _id: mockUser._id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
    });

    it('should return 401 for invalid credentials (user not found or incorrect password)', async () => {
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          callback(null, false, { message: 'Incorrect username or password.' });
        };
      });

      const response = await request(app)
        .post('/user/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Incorrect username or password.');
    });

    it('should return 500 if passport.authenticate calls back with an error', async () => {
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          callback(new Error('Passport auth error'), false, null);
        };
      });

      const response = await request(app)
        .post('/user/login')
        .send(loginData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error during login');
      expect(response.body.error).toBe('Passport auth error');
    });

    it('should return 500 if req.login fails', async () => {
      const mockUser = { _id: 'mockUserId', email: loginData.email, name: 'Test User' } as IUser;
      mockPassportAuthenticate.mockImplementation((strategy, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          callback(null, mockUser, null); // Simulate successful authentication
        };
      });

      // Create a new app instance to override req.login for this specific test
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
      // No need to call passport.initialize/session for this specific override

      tempApp.use((req: any, res, next) => {
        req.login = jest.fn((user, options, cb) => {
          if (typeof options === 'function') cb = options;
          cb(new Error("Simulated req.login error")); // Make req.login fail
        });
        // Ensure other passport properties are there if needed by the router, though not for this path
        req.logout = jest.fn();
        req.isAuthenticated = jest.fn();
        next();
      });
      tempApp.use('/user', UserRouter); // Use the same router

      const response = await request(tempApp)
        .post('/user/login')
        .send(loginData);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error establishing login session');
      expect(response.body.error).toBe('Simulated req.login error');
    });
  });

  describe('GET /user/logout', () => {
    it('should logout the user successfully', async () => {
      // To test logout, we need to simulate a logged-in user first.
      // We can do this by setting up req.user in a temporary middleware for this test.
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
      // No need for full passport.initialize/session here

      let logoutFn: jest.Mock | undefined;

      tempApp.use((req: any, res, next) => {
        req.user = { _id: 'testUserId', email: 'test@example.com' }; // Simulate logged-in user
        req.isAuthenticated = jest.fn(() => true);
        logoutFn = req.logout = jest.fn((options, callback) => { // Assign to logoutFn
          if (typeof options === 'function') callback = options;
          req.user = null;
          if (callback) callback(null);
        });
        next();
      });
      tempApp.use('/user', UserRouter);

      const response = await request(tempApp).get('/user/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
      expect(logoutFn).toHaveBeenCalledTimes(1);
    });

    it('should return 500 if req.logout fails', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));

      tempApp.use((req: any, res, next) => {
        req.user = { _id: 'testUserId', email: 'test@example.com' };
        req.isAuthenticated = jest.fn(() => true);
        req.logout = jest.fn((options, callback) => {
          if (typeof options === 'function') callback = options;
          if (callback) callback(new Error("Simulated logout error"));
        });
        next();
      });
      tempApp.use('/user', UserRouter);

      const response = await request(tempApp).get('/user/logout');
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Error logging out');
      expect(response.body.error).toBe('Simulated logout error');
    });

    it('should return 500 if req.logout is not available', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));

      tempApp.use((req: any, res, next) => {
        req.user = { _id: 'testUserId', email: 'test@example.com' };
        req.isAuthenticated = jest.fn(() => true);
        req.logout = undefined; // Simulate req.logout not being available
        next();
      });
      tempApp.use('/user', UserRouter);

      const response = await request(tempApp).get('/user/logout');
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Logout feature not available.');
    });
  });

  describe('GET /user/me', () => {
    it('should return current user info if authenticated', async () => {
      const mockUser = { _id: 'testId', email: 'me@example.com', name: 'Me User', role: 'user' };

      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));

      tempApp.use((req: any, res, next) => {
        req.user = mockUser; // Set req.user to simulate authenticated state
        req.isAuthenticated = jest.fn(() => true);
        // No need for req.login or req.logout mocks for this specific test
        next();
      });
      tempApp.use('/user', UserRouter);

      const response = await request(tempApp).get('/user/me');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUser);
    });

    it('should return 401 if not authenticated', async () => {
      const tempApp = express();
      tempApp.use(express.json());
      tempApp.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));

      tempApp.use((req: any, res, next) => {
        req.user = undefined; // Ensure no user is set
        req.isAuthenticated = jest.fn(() => false);
        next();
      });
      tempApp.use('/user', UserRouter);

      const response = await request(tempApp).get('/user/me');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('User not authenticated');
    });
  });
});
