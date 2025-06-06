import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import mongoose from 'mongoose';
import authMiddleware, { ensureAuthenticated } from '../../../../../../../lib/auth/session'; // Adjusted path depth
import UserCalendarLink from '../../../../../../../api/models/UserCalendarLink';  // Adjusted path depth
import { IUser } from '../../../../../../../api/models/User'; // Adjusted path depth
import { OutlookCalendarService } from '../../../../../../../api/services/outlook_calendar_service'; // Adjusted path

const outlookService = new OutlookCalendarService();

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (calendar/links/[linkId]/index):', err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'DELETE') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found' });
  },
});

handler.use(authMiddleware);
handler.use(ensureAuthenticated);

handler.delete(async (req, res) => {
  try {
    const user = req.user as IUser;
    const { linkId } = req.query; // linkId from the dynamic route segment

    // ensureAuthenticated should already guarantee user and user._id
    // if (!user || !user._id) {
    //   return res.status(401).json({ message: 'User session invalid' });
    // }

    if (!linkId || typeof linkId !== 'string' || !mongoose.Types.ObjectId.isValid(linkId)) {
      return res.status(400).json({ message: 'Invalid or missing link ID.' });
    }

    const calendarLink = await UserCalendarLink.findOne({ _id: linkId, userId: user._id });

    if (!calendarLink) {
      return res.status(404).json({ message: 'Calendar link not found or not authorized.' });
    }

    // Attempt to revoke access token if it's an Outlook calendar
    if (calendarLink.provider === 'outlook') {
      try {
        // getDecryptedAccessToken() is a method on the model instance
        const decryptedAccessToken = calendarLink.getDecryptedAccessToken();
        if (decryptedAccessToken) { // Ensure token exists before attempting revoke
            await outlookService.revokeAuth(decryptedAccessToken);
            console.log(`Revoked Outlook access for link ${linkId}`);
        } else {
            console.warn(`No access token found to revoke for Outlook link ${linkId}`);
        }
      } catch (revokeError: any) {
        console.warn(`Could not revoke Outlook access for link ${linkId}: ${revokeError.message}`);
        // Continue with deletion even if revocation fails
      }
    }
    // TODO: Add Google revocation when GoogleCalendarService is implemented

    await UserCalendarLink.findByIdAndDelete(linkId);

    console.log(`Deleted calendar link ${linkId} for user ${user._id}`);
    return res.json({
      message: 'Calendar link removed successfully',
      linkId,
    });

  } catch (error: any) {
    console.error('Error removing calendar link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error removing link.';
    return res.status(500).json({
      message: 'Failed to remove calendar link',
      error: errorMessage,
    });
  }
});

export default handler;
