/**
 * @fileoverview Microsoft Outlook OAuth 2.0 strategy for Passport.js
 * Handles Microsoft authentication for Outlook Calendar integration
 */

import passport from "passport";
import { Strategy as OAuth2Strategy, VerifyCallback } from "passport-oauth2";
import axios from "axios";

/**
 * Interface for Microsoft Outlook OAuth profile data
 */
export interface OutlookProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Interface for tokens received from Microsoft OAuth
 */
export interface OutlookTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type: string;
  scope: string;
}

/**
 * Configure Microsoft Outlook OAuth 2.0 strategy for Passport.js
 */
export const configureOutlookStrategy = (): void => {
  const clientID = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const tenantId = process.env.OUTLOOK_TENANT_ID || "common";
  const callbackURL =
    process.env.OUTLOOK_CALLBACK_URL || "/api/v1/calendar/outlook/callback";

  if (!clientID || !clientSecret) {
    console.error(
      "Microsoft Outlook OAuth credentials not found. Please set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET environment variables."
    );
    return;
  }

  passport.use(
    "microsoft",
    new OAuth2Strategy(
      {
        authorizationURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenURL: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        clientID,
        clientSecret,
        callbackURL,
        scope: [
          "openid",
          "profile",
          "email",
          "Calendars.Read",
          "offline_access",
        ],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: unknown, // OAuth2Strategy doesn't provide typed profile
        done: VerifyCallback
      ) => {
        try {
          // Get user profile from Microsoft Graph API
          const profileResponse = await axios.get(
            "https://graph.microsoft.com/v1.0/me",
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          const userProfile = profileResponse.data;

          // Extract profile information
          const outlookProfile: OutlookProfile = {
            id: userProfile.id,
            email: userProfile.mail || userProfile.userPrincipalName || "",
            name: userProfile.displayName || "",
            picture: undefined, // Can be fetched separately if needed
          };

          // Prepare tokens object
          const tokens: OutlookTokens = {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: "Bearer",
            scope: "Calendars.Read offline_access",
            expires_at: Date.now() + 3600 * 1000, // Default 1 hour expiry
          };

          console.log(
            "Microsoft Outlook OAuth successful for user:",
            outlookProfile.email
          );

          // Return profile and tokens for handling in the callback route
          // The actual user linking and token storage will be handled in the service
          // Define user object type for Passport
          interface OutlookAuthUser {
            profile: OutlookProfile;
            tokens: OutlookTokens;
          }
          return done(null, { profile: outlookProfile, tokens } as OutlookAuthUser); // Typed user object
        } catch (error) {
          console.error(
            "Error in Microsoft Outlook OAuth verify callback:",
            error
          );
          return done(error, false);
        }
      }
    )
  );
};

/**
 * Serialize user for session (required by Passport)
 * For Microsoft OAuth, we'll store minimal session data
 */
export const configureOutlookSerialization = (): void => {
  // Define session user type
  interface SessionUser {
    profile?: OutlookProfile;
    id?: string;
    tokens?: OutlookTokens;
  }
  
  passport.serializeUser((user: Express.User, done) => { // Express.User is the standard Passport user type
    const outlookUser = user as OutlookAuthUser;
    // Store minimal data in session
    done(null, {
      id: outlookUser.profile?.id || outlookUser.id,
      source: "microsoft",
    });
  });

  passport.deserializeUser((sessionUser: { id: string; source: string }, done) => { // Typed session data
    // For Microsoft OAuth flow, we don't need full user deserialization
    // as tokens are handled separately in the service
    done(null, sessionUser);
  });
};

/**
 * Initialize Microsoft Outlook OAuth strategy
 */
export const initializeOutlookAuth = (): void => {
  configureOutlookStrategy();
  configureOutlookSerialization();
  console.log("Microsoft Outlook OAuth strategy initialized");
};
