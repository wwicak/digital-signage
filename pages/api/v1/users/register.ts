import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import authMiddlewareHavingPassport from '../../../../../lib/auth/session'; // Renamed for clarity
import User, { IUser } from '../../../../../api/models/User'; // Path to User model and IUser

// Define interfaces for request bodies
interface RegisterRequestBody {
  email?: string;    // Assuming email is the usernameField
  password?: string;
  name?: string;
}

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (user/register):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    // This route specifically handles POST for registration
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found at this sub-route' });
  },
});

// Apply session and passport initialization. Passport itself is not directly used for registration
// in terms of `passport.authenticate`, but `req.logIn` (used after registration) needs it.
handler.use(authMiddlewareHavingPassport);

handler.post(async (req, res) => {
  const { email, password, name } = req.body as RegisterRequestBody;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // User.register is a static method from passport-local-mongoose.
  // It requires the model instance to have the username field (email in this case) set.
  // Other fields (like name) can also be included in this initial object.
  const userToRegister = new User({
      email: email, // passport-local-mongoose will use this as the usernameField
      name: name,
      // 'username' field is not set if 'email' is the usernameField configured in User model
      // and not a separate schema field.
  });

  try {
    // User.register(newUser, password, callback)
    // passport-local-mongoose's User.register handles password hashing and saving.
    User.register(userToRegister, password, (err: any, registeredUser?: IUser) => {
      if (err) {
        console.error('Registration error (User.register):', err);
        // Common errors: UserExistsError
        return res.status(500).json({ message: 'Error registering user', error: err.message });
      }
      if (!registeredUser) {
        // This case should ideally be covered by 'err' but as a safeguard
        return res.status(500).json({ message: 'User registration failed, user object not returned.' });
      }

      // Log in the user automatically after registration using req.logIn
      req.logIn(registeredUser, (loginErr) => {
        if (loginErr) {
          console.error('Login after registration error:', loginErr);
          // If login fails, the user is registered but not logged in.
          // Decide on response: still 201 but with login error, or a different status.
          return res.status(500).json({
            message: 'User registered but login failed. Please try logging in.',
            error: loginErr.message
          });
        }
        // req.user should now be populated. Send back a sanitized user object.
        const userResponse = {
          _id: registeredUser._id,
          email: registeredUser.email,
          name: registeredUser.name,
          role: registeredUser.role
        };
        return res.status(201).json({
          message: 'User registered and logged in successfully',
          user: userResponse
        });
      });
    });
  } catch (error: any) {
    // This outer catch should ideally not be hit if User.register handles its errors via callback.
    console.error('Unexpected error during registration process:', error);
    return res.status(500).json({ message: 'Unexpected error during registration', error: error.message });
  }
});

export default handler;
