import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import authMiddleware, { ensureAuthenticated } from '../../../../../../lib/auth/session';
import UserCalendarLink from '../../../../../../api/models/UserCalendarLink';
import { IUser } from '../../../../../../api/models/User';

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (calendar/links/index):', err);
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
  try {
    const user = req.user as IUser;
    // ensureAuthenticated guarantees user and user._id exist
    // if (!user || !user._id) {
    //   return res.status(401).json({ message: 'User session invalid' });
    // }

    const calendarLinks = await UserCalendarLink.find({ userId: user._id })
      .select('-accessToken -refreshToken'); // Exclude sensitive tokens

    // Transform for frontend response (copied from original)
    const linksResponse = calendarLinks.map(link => ({
      _id: link._id,
      provider: link.provider,
      externalUserId: link.externalUserId, // This is the calendar provider's user ID for the linked account
      calendarId: link.calendarId, // Usually 'primary' or a specific calendar ID from the provider
      scopes: link.scopes,
      isActive: link.isActive,
      lastSyncStatus: link.lastSyncStatus,
      lastSyncError: link.lastSyncError,
      lastSyncedAt: link.lastSyncedAt,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    }));

    return res.json({
      message: 'Calendar links retrieved successfully',
      links: linksResponse,
      total: linksResponse.length,
    });

  } catch (error: any) {
    console.error('Error fetching calendar links:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching links.';
    return res.status(500).json({
      message: 'Failed to fetch calendar links',
      error: errorMessage,
    });
  }
});

export default handler;
