import { NextApiRequest, NextApiResponse } from 'next';
import nc from 'next-connect';
import passport from 'passport';
import mongoose from 'mongoose';
import authMiddleware from '../../../../../../lib/auth/session';
import UserCalendarLink, { IUserCalendarLink } from '../../../../../../api/models/UserCalendarLink'; // Adjusted path
// IUser might be needed if we intend to log the user in after linking, but OAuth callback usually doesn't re-login.
// import { IUser } from '../../../../../../api/models/User';

const handler = nc<NextApiRequest, NextApiResponse>({
  onError: (err, req, res, next) => {
    console.error('Error in API route (calendar/outlook/callback):', err);
    // Redirect to an error page on the frontend
    const errorQuery = encodeURIComponent(err.message || 'Outlook OAuth callback failed.');
    res.redirect(`/settings/integrations?status=outlook_error&error=${errorQuery}`);
  },
  onNoMatch: (req, res) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method Not Allowed' });
    }
    res.status(404).json({ message: 'Not Found' });
  },
});

// Apply session and passport initialization. This is crucial for passport.authenticate.
handler.use(authMiddleware);

handler.get(
  // Use passport.authenticate middleware for the 'microsoft' strategy.
  // session: false because we are not creating a new session for the OAuth provider itself,
  // rather using the tokens to link to an existing user session.
  // failureRedirect will be handled by onError or by checking req.user.
  (req: NextApiRequest, res: NextApiResponse, next: any) => {
    passport.authenticate('microsoft', { session: false }, async (err: any, authData: any) => {
      if (err) {
        console.error('Outlook OAuth strategy error:', err);
        const errorQuery = encodeURIComponent(err.message || 'Authentication strategy failed.');
        return res.redirect(`/settings/integrations?status=outlook_error&error=${errorQuery}`);
      }
      if (!authData) {
        console.error('Outlook OAuth callback: No authData received from strategy.');
        return res.redirect('/settings/integrations?status=outlook_error&error=NoAuthData');
      }

      try {
        const { profile, tokens } = authData; // As per outlook_strategy.ts
        if (!profile || !tokens) {
          throw new Error('Missing profile or tokens from Microsoft OAuth callback.');
        }

        const userIdFromState = req.query.state as string;
        if (!userIdFromState || !mongoose.Types.ObjectId.isValid(userIdFromState)) {
          throw new Error('Invalid or missing user ID in OAuth state parameter.');
        }

        const userId = new mongoose.Types.ObjectId(userIdFromState);

        const calendarLinkData = {
          userId: userId,
          provider: 'outlook' as const,
          externalUserId: profile.id, // from OutlookProfile
          calendarId: 'primary',
          accessToken: tokens.access_token, // Will be encrypted by pre-save hook in model
          refreshToken: tokens.refresh_token || undefined,
          // expires_at from tokens is usually a timestamp (seconds or ms) or a Date object
          // If it's a number, it might be seconds since epoch or duration.
          // The original strategy sets expires_at: Date.now() + 3600 * 1000
          tokenExpiryDate: tokens.expires_at ? new Date(tokens.expires_at) : undefined,
          scopes: tokens.scope ? (typeof tokens.scope === 'string' ? tokens.scope.split(' ') : tokens.scope) : ['Calendars.Read', 'offline_access'],
          isActive: true,
        };

        const existingLink = await UserCalendarLink.findOne({
          userId: calendarLinkData.userId,
          provider: 'outlook',
          // Using externalUserId might be better if profile.id is unique across tenants for a user
          // If not, might need to include tenantId or a different unique identifier.
          // Original used profile.id, so sticking to that.
          externalUserId: profile.id
        });

        if (existingLink) {
          Object.assign(existingLink, calendarLinkData);
          await existingLink.save();
          console.log(`Updated Outlook calendar link for user ${userIdFromState}`);
        } else {
          const newLink = new UserCalendarLink(calendarLinkData);
          await newLink.save();
          console.log(`Created new Outlook calendar link for user ${userIdFromState}`);
        }

        return res.redirect('/settings/integrations?status=outlook_success');

      } catch (processingError: any) {
        console.error('Error processing Outlook OAuth callback data:', processingError);
        const errorQuery = encodeURIComponent(processingError.message || 'Error processing callback data.');
        return res.redirect(`/settings/integrations?status=outlook_error&error=${errorQuery}`);
      }
    })(req, res, next); // Important to call the authenticate middleware with (req, res, next)
  }
);

export default handler;
