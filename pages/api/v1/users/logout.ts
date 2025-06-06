import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import authMiddleware from '../../../../../lib/auth/session'; // Path to our auth setup

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (user/logout):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    // This route can be GET or POST as per original, but GET is common for logout links.
    // For CSRF protection, POST is sometimes preferred if the action changes state significantly.
    // Original was GET.
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    // Fallthrough for non-matching methods (should be caught by the above)
    res.status(404).json({ message: 'Not Found at this sub-route' });
  },
});

handler.use(authMiddleware); // Apply session and passport initialization for req.logout

// Handle both GET and POST for logout, similar to how Express handles routes without method specification
const logoutHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (req.logout) { // req.logout is provided by Passport
    req.logout((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Error logging out', error: err.message });
      }
      // Successfully logged out. Destroy session data.
      // req.session.destroy() might be needed if cookie-session doesn't clear it all on logout.
      // However, passport's req.logout() typically handles clearing the login session.
      return res.json({ message: 'Logout successful' });
    });
  } else {
    // This case should not be reached if passport is initialized correctly by authMiddleware
    return res.status(500).json({ message: 'Logout feature not available.' });
  }
};

handler.get(logoutHandler);
handler.post(logoutHandler); // Allow POST as well, can be useful.

export default handler;
