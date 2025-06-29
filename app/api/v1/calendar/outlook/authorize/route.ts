import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";

// Force dynamic rendering to prevent static generation errors
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Check if Outlook OAuth credentials are configured
    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const redirectUri =
      process.env.OUTLOOK_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL}/api/v1/calendar/outlook/callback`;

    if (!clientId) {
      return NextResponse.json(
        {
          message:
            "Outlook Calendar integration is not configured. Please set OUTLOOK_CLIENT_ID in environment variables.",
          configured: false,
        },
        { status: 503 }
      );
    }

    // Generate OAuth URL
    const scopes = [
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/User.Read",
    ].join(" ");

    const authUrl =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_mode=query&` +
      `state=${user._id.toString()}`;

    return NextResponse.json({
      authUrl,
      provider: "outlook",
      configured: true,
      message: "Redirect to this URL to authorize Outlook calendar access",
    });
  } catch (error: unknown) {
    console.error("Error initiating Outlook OAuth:", error);
    // Use type-safe error handling utilities
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}
