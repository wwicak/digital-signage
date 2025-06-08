import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/helpers/auth_helper";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Check if Google OAuth credentials are configured
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/v1/calendar/google/callback`;

    if (!clientId) {
      return NextResponse.json(
        { 
          message: "Google Calendar integration is not configured. Please set GOOGLE_CLIENT_ID in environment variables.",
          configured: false 
        },
        { status: 503 }
      );
    }

    // Generate OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${user._id.toString()}`;

    return NextResponse.json({
      authUrl,
      provider: "google",
      configured: true,
      message: "Redirect to this URL to authorize Google calendar access",
    });
  } catch (error: any) {
    console.error("Error initiating Google OAuth:", error);
    return NextResponse.json(
      { message: error.message || "Error initiating Google authorization" },
      { status: error.status || 500 }
    );
  }
}
