import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import authMiddleware, { ensureAuthenticated } from '../../../../../lib/auth/session'; // Path to our auth setup
import { IUser } from '../../../../../api/models/User'; // Path to IUser

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (user/me):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found at this sub-route' });
  },
});

handler.use(authMiddleware); // Apply session and passport initialization
handler.use(ensureAuthenticated); // Protect the /me route

handler.get(async (req, res) => {
  // ensureAuthenticated middleware should guarantee that req.user is populated.
  const user = req.user as IUser;

  // Sanitize user object before sending
  const userResponse = {
    _id: user._id,
    // username: user.username, // Include if 'username' is a distinct field and not the usernameField
    email: user.email,       // Include if 'email' is the usernameField or a stored field
    name: user.name,
    role: user.role
    // Do not send password hash or other sensitive data
  };

  res.json(userResponse);
});

export default handler;
