import express, { Request, Response, NextFunction, Router } from 'express';
import passport from 'passport';
import User, { IUser } from '../models/User'; // Assuming User.ts exports IUser and the default export is the User model

const router: Router = express.Router();

// Define interfaces for request bodies
interface RegisterRequestBody {
  username?: string; // Or email if that's the username field
  email?: string;    // If email is separate from username
  password?: string;
  name?: string;     // Example custom field
  // Add other fields expected during registration
}

interface LoginRequestBody {
  username?: string; // Or email
  password?: string;
}

// POST /register - User registration
router.post('/register', async (req: Request<{}, any, RegisterRequestBody>, res: Response, next: NextFunction) => {
  const { email, password, name } = req.body; // Assuming 'email' is the usernameField

  if (!email || !password) { // Check for the field used as username
    res.status(400).json({ message: 'Username (email) and password are required.' });
    return;
  }
  
  // User.register is a static method from passport-local-mongoose
  // The object passed should contain the usernameField ('email' in this case) and any other schema fields.
  const userToRegister = new User({ 
      email: email, 
      name: name, 
      // Do not set 'username' field here if 'email' is the usernameField and not a separate schema field
  });

  try {
    // User.register will hash the password and save the user.
    // The callback receives (err, user)
    await User.register(userToRegister, password, (err: any, registeredUser?: IUser) => {
      if (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: 'Error registering user', error: err.message });
        return;
      }
      if (!registeredUser) {
        // This case should ideally be covered by 'err' but as a safeguard
        res.status(500).json({ message: 'User registration failed, user object not returned.' });
        return;
      }
      // Log in the user automatically after registration
      req.login(registeredUser, (loginErr) => { 
        if (loginErr) {
          console.error('Login after registration error:', loginErr);
          res.status(500).json({ message: 'Error logging in user after registration', error: loginErr.message });
          return;
        }
        // req.user should now be populated. Send back a sanitized user object.
        const userResponse = { _id: registeredUser._id, email: registeredUser.email, name: registeredUser.name, role: registeredUser.role };
        res.status(201).json({ message: 'User registered and logged in successfully', user: userResponse });
      });
    });
  } catch (error: any) { 
    console.error('Outer registration catch:', error); // Should not happen if User.register handles its promise/callback correctly
    res.status(500).json({ message: 'Unexpected error during registration', error: error.message });
  }
});

// POST /login - User login
router.post('/login', (req: Request<{}, any, LoginRequestBody>, res: Response, next: NextFunction) => {
  passport.authenticate('local', (err: any, user?: IUser | false, info?: any) => {
    if (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Error during login', error: err.message });
      return;
    }
    if (!user) {
      res.status(401).json({ message: info?.message || 'Login failed. Invalid credentials.' });
      return;
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('req.login error:', loginErr);
        res.status(500).json({ message: 'Error establishing login session', error: loginErr.message });
        return;
      }
      const userResponse = { _id: user._id, email: user.email, name: user.name, role: user.role };
      res.json({ message: 'Login successful', user: userResponse });
    });
  })(req, res, next); 
});


// GET /logout - User logout
router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  if (req.logout) { 
    req.logout((err: any) => { 
        if (err) {
            console.error('Logout error:', err);
            res.status(500).json({ message: 'Error logging out', error: err.message });
            return;
        }
        res.json({ message: 'Logout successful' });
    });
  } else {
    res.status(500).json({ message: 'Logout feature not available.'});
  }
});


// GET /me - Get current logged-in user's information
router.get('/me', (req: Request, res: Response) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user as IUser; 
    res.json({
      _id: user._id,
      // username: user.username, // If 'username' is a distinct field and not the usernameField
      email: user.email, // If 'email' is the usernameField or a stored field
      name: user.name,
      role: user.role
    });
  } else {
    res.status(401).json({ message: 'User not authenticated' });
  }
});

export default router;
