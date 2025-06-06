import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import authMiddleware, { ensureAuthenticated } from '../../../../../../lib/auth/session';
import { OutlookCalendarService } from '../../../../../../api/services/outlook_calendar_service'; // Adjusted path
import { IUser } from '../../../../../../api/models/User'; // Adjusted path

const outlookService = new OutlookCalendarService();

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (calendar/outlook/authorize):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found' });
  },
});

handler.use(authMiddleware); // Initializes session, passport
handler.use(ensureAuthenticated); // Requires user to be logged in

handler.get(async (req, res) => {
  try {
    const user = req.user as IUser;
    // ensureAuthenticated should guarantee user and user._id exist.
    // A redundant check for robustness:
    if (!user || !user._id) {
      return res.status(401).json({ message: 'User session invalid or user ID missing.' });
    }

    // The OutlookCalendarService's initiateAuth method is expected to return an object
    // with an authUrl property. The original code implies it might also use passport
    // or directly generate the URL. Assuming it returns { authUrl: string }.
    // The state parameter (userId) is crucial for linking back during callback.
    const authResponse = outlookService.initiateAuth(user._id.toString());

    if (authResponse && authResponse.authUrl) {
      return res.redirect(authResponse.authUrl);
    } else {
      console.error('Outlook service did not return an authUrl.');
      return res.status(500).json({ message: 'Failed to construct Outlook authorization URL.' });
    }

  } catch (error) {
    console.error('Error initiating Outlook OAuth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during Outlook auth initiation.';
    return res.status(500).json({
      message: 'Failed to initiate calendar authorization',
      error: errorMessage,
    });
  }
});

export default handler;
