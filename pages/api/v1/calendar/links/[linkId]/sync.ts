import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import authMiddleware, { ensureAuthenticated } from '../../../../../../../lib/auth/session'; // Adjusted path depth
import UserCalendarLink from '../../../../../../../api/models/UserCalendarLink'; // Adjusted path depth
import { IUser } from '../../../../../../../api/models/User'; // Adjusted path depth

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (calendar/links/[linkId]/sync):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found' });
  },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

handler.post(async (req, res) => {
  try {
    const user = req.user as IUser;
    const { linkId } = req.query; // linkId from the dynamic route segment

    // if (!user || !user._id) { // Guaranteed by ensureAuthenticated
    //   return res.status(401).json({ message: 'User session invalid' });
    // }

    if (!linkId || typeof linkId !== 'string' || !mongoose.Types.ObjectId.isValid(linkId)) {
      return res.status(400).json({ message: 'Invalid or missing link ID.' });
    }

    const calendarLink = await UserCalendarLink.findOne({
      _id: linkId,
      userId: user._id,
      isActive: true, // Original route checked for isActive
    });

    if (!calendarLink) {
      return res.status(404).json({ message: 'Active calendar link not found or not authorized.' });
    }

    // Placeholder logic from original backend
    return res.json({
      message: 'Manual sync functionality not yet implemented',
      linkId,
      provider: calendarLink.provider,
      status: 'pending',
      note: 'Sync functionality will be implemented in a future update',
    });

  } catch (error: any) {
    console.error('Error triggering manual sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error triggering sync.';
    return res.status(500).json({
      message: 'Failed to trigger manual sync',
      error: errorMessage,
    });
  }
});

export default handler;
