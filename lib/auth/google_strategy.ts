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
// import { IUser } from "../models/User"; // Commented out - not used in OAuth strategy

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
 * Interface for Google authenticated user object
 */
export interface GoogleAuthUser {
  profile: GoogleProfile;
  tokens: GoogleTokens;
  id?: string; // For compatibility with session serialization
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
          // Return typed user object for Passport
          return done(null, { profile: googleProfile, tokens } as unknown as Express.User); // Convert to Express.User type
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
  // Removed unused SessionUser interface - no references found in codebase
  
  passport.serializeUser((user: Express.User, done) => { // Express.User is the standard Passport user type
    // Handle both GoogleAuthUser and regular IUser types
    if (user && typeof user === 'object' && 'profile' in user) {
      const googleUser = user as unknown as GoogleAuthUser;
      // Store minimal data in session for OAuth users
      done(null, {
        id: googleUser.profile?.id || googleUser.id,
        source: "google",
      });
    } else {
      // Handle regular database users
      const dbUser = user as { _id?: string; id?: string };
      done(null, {
        id: dbUser._id || dbUser.id,
        source: "database",
      });
    }
  });

  passport.deserializeUser((sessionUser: { id: string; source: string }, done) => { // Typed session data
    // For Google OAuth flow, we don't need full user deserialization
    // as tokens are handled separately in the service
    // Return a minimal user object that matches Express.User expectations
    done(null, sessionUser as unknown as Express.User);
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
