import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import authMiddleware, { ensureAuthenticated } from '../../../../../../lib/auth/session';

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (calendar/google/authorize):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found' });
  },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

handler.get(async (req, res) => {
  // Placeholder logic from original backend
  res.status(501).json({
    message: 'Google Calendar integration not yet implemented',
    provider: 'google',
  });
});

export default handler;
