/**
 * @fileoverview Google OAuth 2.0 strategy for Passport.js
 * Handles Google authentication for calendar integration
 */

import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";

/**
 * Interface for Google OAuth profile data
 */
export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Interface for tokens received from Google OAuth
 */
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type: string;
  scope: string;
}

/**
 * Configure Google OAuth 2.0 strategy for Passport.js
 */
export const configureGoogleStrategy = (): void => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL || "/api/v1/calendar/google/callback";

  if (!clientID || !clientSecret) {
    console.error(
      "Google OAuth credentials not found. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: [
          "profile",
          "email",
          "https://www.googleapis.com/auth/calendar.readonly",
        ],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
      ) => {
        try {
          // Extract profile information
          const googleProfile: GoogleProfile = {
            id: profile.id,
            email: profile.emails?.[0]?.value || "",
            name: profile.displayName || "",
            picture: profile.photos?.[0]?.value,
          };

          // Prepare tokens object
          const tokens: GoogleTokens = {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: "Bearer",
            scope: "https://www.googleapis.com/auth/calendar.readonly",
            expires_at: Date.now() + 3600 * 1000, // Default 1 hour expiry
          };

          console.log("Google OAuth successful for user:", googleProfile.email);

          // Return profile and tokens for handling in the callback route
          // The actual user linking and token storage will be handled in the service
          // Define user object type for Passport
          interface GoogleAuthUser {
            profile: GoogleProfile;
            tokens: GoogleTokens;
          }
          return done(null, { profile: googleProfile, tokens } as GoogleAuthUser); // Typed user object
        } catch (error) {
          console.error("Error in Google OAuth verify callback:", error);
          return done(error, false);
        }
      }
    )
  );
};

/**
 * Serialize user for session (required by Passport)
 * For Google OAuth, we'll store minimal session data
 */
export const configureGoogleSerialization = (): void => {
  // Define session user type
  interface SessionUser {
    profile?: GoogleProfile;
    id?: string;
    tokens?: GoogleTokens;
  }
  
  passport.serializeUser((user: Express.User, done) => { // Express.User is the standard Passport user type
    // Store minimal data in session
    done(null, {
      id: user.profile?.id || user.id,
      source: "google",
    });
  });

  passport.deserializeUser((sessionUser: { id: string; source: string }, done) => { // Typed session data
    // For Google OAuth flow, we don't need full user deserialization
    // as tokens are handled separately in the service
    done(null, sessionUser);
  });
};

/**
 * Initialize Google OAuth strategy
 */
export const initializeGoogleAuth = (): void => {
  configureGoogleStrategy();
  configureGoogleSerialization();
  console.log("Google OAuth strategy initialized");
};
