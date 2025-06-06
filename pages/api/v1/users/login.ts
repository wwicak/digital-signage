import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import passport from 'passport'; // We need the passport instance configured in session.ts
import authMiddleware from '../../../../../lib/auth/session'; // Path to our auth setup
import { IUser } from '../../../../../api/models/User'; // Path to IUser

// Define interfaces for request bodies
interface LoginRequestBody {
  username?: string; // Or email
  password?: string;
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (user/login):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    res.status(404).json({ message: 'Not Found at this sub-route' });
  },
});

handler.use(authMiddleware); // Apply session and passport initialization

handler.post(async (req, res) => {
  // passport.authenticate is middleware, needs to be called in a way next-connect handles
  // We adapt the custom callback strategy
  passport.authenticate('local', (err: any, user?: IUser | false, info?: any) => {
    if (err) {
      console.error('Login error (passport.authenticate):', err);
      return res.status(500).json({ message: 'Error during login', error: err.message });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Login failed. Invalid credentials.' });
    }

    // req.login is added by passport.initialize()
    // Ensure NextApiRequest is augmented to know about req.login
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('req.login error:', loginErr);
        return res.status(500).json({ message: 'Error establishing login session', error: loginErr.message });
      }
      // Sanitize user object before sending
      const userResponse = { _id: user._id, email: user.email, name: user.name, role: user.role };
      return res.json({ message: 'Login successful', user: userResponse });
    });
  })(req, res, (err: any) => {
    // This 'next' callback for passport.authenticate is for passing control in Express.
    // If an error occurs in the authenticate function itself (before strategy runs),
    // it might call this. Or if strategy calls next(err).
    if (err) {
        console.error('Passport authenticate next() error:', err);
        return res.status(500).json({ message: 'Authentication error', error: err.message });
    }
    // This part should ideally not be reached if authenticate calls res.json or res.status directly.
    // If it is reached without an error, it might mean the response wasn't handled.
    // For a POST, if not handled, it might hang or 404 later.
    // However, our custom callback handles the response.
});

});

export default handler;
