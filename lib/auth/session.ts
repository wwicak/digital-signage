import nc from 'next-connect';
import passport from 'passport';
import session from 'cookie-session';
import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import User, { IUser } from '../../api/models/User'; // Path relative to lib/auth/
import * as Keys from '../../keys'; // Path relative to lib/auth/
import { initializeOutlookAuth } from '../../api/auth/outlook_strategy'; // Path relative to lib/auth/
import { initializeGoogleAuth } from '../../api/auth/google_strategy'; // Path relative to lib/auth/
import dbConnect from '../dbConnect'; // Path relative to lib/auth/

if (!Keys.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not defined. Authentication cannot be initialized.');
}

// Configure Passport (Local Strategy)
if (User && typeof User.createStrategy === 'function') {
  passport.use(User.createStrategy());
  passport.serializeUser(User.serializeUser() as any);
  passport.deserializeUser(User.deserializeUser() as any);
} else {
  console.error('User model is not configured correctly for Passport local strategy.');
}

// Initialize OAuth strategies
try {
  initializeOutlookAuth();
} catch (error) {
  console.warn('Outlook OAuth strategy initialization failed in lib/auth/session.ts:', error);
}

try {
  initializeGoogleAuth();
} catch (error) {
  console.warn('Google OAuth strategy initialization failed in lib/auth/session.ts:', error);
}

// Middleware to ensure database connection
const ensureDbConnection = async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  try {
    await dbConnect();
    next();
  } catch (error: any) { // Added 'any' type for error
    console.error('Database connection failed in middleware:', error);
    res.status(500).json({ message: 'Database connection error.', error: error.message });
  }
};

const auth = nc<NextApiRequest, NextApiResponse>()
  .use(ensureDbConnection) // Ensure DB connection first
  .use(
    session({
      secret: Keys.SESSION_SECRET,
      name: 'sessionId',
      cookie: { secure: Keys.ENVIRON === 'PROD', httpOnly: true, sameSite: 'lax' }, // Added common cookie options
    })
  )
  .use(passport.initialize())
  .use(passport.session());

export default auth;

// Higher-order function (or middleware) to protect API routes
export function withAuthentication(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return handler(req, res);
    }
    res.status(401).json({ message: 'User not authenticated' });
  };
}

// Middleware for use with next-connect
export const ensureAuthenticated = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
};

// Middleware to ensure user is an admin
export const ensureAdmin = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  const user = req.user as IUser;
  if (user && user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};
