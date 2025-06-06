import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
// import authMiddleware from '../../../../../../lib/auth/session'; // Not strictly needed if not using ensureAuthenticated

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (calendar/google/callback):', err);
    // Redirect to an error page on the frontend
    const errorQuery = encodeURIComponent(err.message || 'Google OAuth callback failed.');
    res.redirect(`/settings/integrations?status=google_error&error=${errorQuery}`);
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found' });
  },
});

// authMiddleware might be needed if passport.authenticate itself relies on some session setup,
// even if { session: false } is used. It's safer to include it.
// import authMiddleware from '../../../../../../lib/auth/session';
// handler.use(authMiddleware);


handler.get(async (req, res) => {
  // Placeholder logic from original backend
  // In a real scenario, this would involve passport.authenticate('google', ...)
  console.log('Google OAuth callback hit, but not implemented.');
  res.redirect('/settings/integrations?status=google_not_implemented');
});

export default handler;
