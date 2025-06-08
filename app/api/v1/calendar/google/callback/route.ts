import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UserCalendarLink from "@/lib/models/UserCalendarLink";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This is the userId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/calendar-integration?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/calendar-integration?error=missing_parameters", request.url)
      );
    }

    if (!mongoose.Types.ObjectId.isValid(state)) {
      return NextResponse.redirect(
        new URL("/calendar-integration?error=invalid_user", request.url)
      );
    }

    // Check if Google OAuth is configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/v1/calendar/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/calendar-integration?error=google_not_configured", request.url)
      );
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json();

      // Get user profile
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to get user profile');
      }

      const profile = await profileResponse.json();

      // Check if calendar link already exists
      const existingLink = await UserCalendarLink.findOne({
        userId: state,
        provider: "google",
        externalUserId: profile.id,
      });

      if (existingLink) {
        // Update existing link
        existingLink.accessToken = tokens.access_token;
        existingLink.refreshToken = tokens.refresh_token || existingLink.refreshToken;
        existingLink.tokenExpiryDate = new Date(Date.now() + (tokens.expires_in * 1000));
        existingLink.isActive = true;
        existingLink.lastSyncStatus = "success";
        existingLink.lastSyncedAt = new Date();
        await existingLink.save();
      } else {
        // Create new calendar link
        const calendarLink = new UserCalendarLink({
          userId: state,
          provider: "google",
          externalUserId: profile.id,
          calendarId: "primary",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiryDate: new Date(Date.now() + (tokens.expires_in * 1000)),
          scopes: tokens.scope ? tokens.scope.split(" ") : [],
          isActive: true,
          lastSyncStatus: "success",
          lastSyncedAt: new Date(),
        });
        await calendarLink.save();
      }

      return NextResponse.redirect(
        new URL("/calendar-integration?success=google_connected", request.url)
      );
    } catch (authError: any) {
      console.error("Google OAuth error:", authError);
      return NextResponse.redirect(
        new URL(`/calendar-integration?error=${encodeURIComponent(authError.message)}`, request.url)
      );
    }
  } catch (error: any) {
    console.error("Error handling Google OAuth callback:", error);
    return NextResponse.redirect(
      new URL(`/calendar-integration?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
