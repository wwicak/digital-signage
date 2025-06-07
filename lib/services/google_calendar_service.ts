/**
 * @fileoverview Google Calendar Integration Service
 * Handles Google Calendar API operations including authentication and meeting retrieval
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";

/**
 * Interface for Google OAuth tokens
 */
export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type: string;
  scope: string;
}

/**
 * Interface for calendar meeting data
 */
export interface CalendarMeeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: CalendarAttendee[];
}

/**
 * Interface for meeting attendees
 */
export interface CalendarAttendee {
  email: string;
  responseStatus: "needsAction" | "declined" | "tentative" | "accepted";
  displayName?: string;
}

/**
 * Interface for auth initiation response
 */
export interface AuthInitiationResponse {
  authUrl: string;
  state?: string;
}

/**
 * Interface for auth callback response
 */
export interface AuthCallbackResponse {
  tokens: GoogleTokens;
  profile: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Google Calendar Service Class
 * Provides methods for Google Calendar integration
 */
export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private readonly baseUrl = "https://www.googleapis.com/calendar/v3";
  private readonly revokeUrl = "https://oauth2.googleapis.com/revoke";

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_CALLBACK_URL || "/api/v1/calendar/google/callback";

    if (!clientId || !clientSecret) {
      throw new Error(
        "Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
      );
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Initiates Google OAuth flow and returns authorization URL
   * @param userId - The user ID to associate with the auth request
   * @returns Authorization URL and optional state parameter
   */
  public initiateAuth(userId: string): AuthInitiationResponse {
    try {
      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ];

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: scopes,
        prompt: "consent", // Force consent to get refresh token
        state: userId, // Pass userId as state parameter
        include_granted_scopes: true,
      });

      console.log(`Generated Google OAuth URL for user ${userId}`);

      return {
        authUrl,
        state: userId,
      };
    } catch (error) {
      console.error("Error generating Google OAuth URL:", error);
      throw new Error("Failed to generate authorization URL");
    }
  }

  /**
   * Handles OAuth callback and exchanges authorization code for tokens
   * @param code - Authorization code from Google
   * @param userId - User ID from state parameter
   * @returns Tokens and user profile information
   */
  public async handleAuthCallback(
    code: string,
    userId: string
  ): Promise<AuthCallbackResponse> {
    try {
      // Exchange authorization code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error("No access token received from Google");
      }

      // Set credentials to fetch user profile
      this.oauth2Client.setCredentials(tokens);

      // Get user profile information
      const oauth2 = google.oauth2({ version: "v2", auth: this.oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      const tokenData: GoogleTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expires_at: tokens.expiry_date || Date.now() + 3600 * 1000,
        token_type: "Bearer",
        scope:
          tokens.scope || "https://www.googleapis.com/auth/calendar.readonly",
      };

      console.log(
        `Google OAuth callback successful for user ${userId}, email: ${profile.email}`
      );

      return {
        tokens: tokenData,
        profile: {
          id: profile.id || "",
          email: profile.email || "",
          name: profile.name || "",
        },
      };
    } catch (error) {
      console.error("Error handling Google OAuth callback:", error);
      throw new Error(
        `Failed to exchange authorization code: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Refreshes an expired access token using refresh token
   * @param refreshTokenValue - The refresh token
   * @returns New access token and expiration
   */
  public async refreshToken(refreshTokenValue: string): Promise<GoogleTokens> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshTokenValue,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error("No access token received from refresh");
      }

      const tokenData: GoogleTokens = {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || refreshTokenValue,
        expires_at: credentials.expiry_date || Date.now() + 3600 * 1000,
        token_type: "Bearer",
        scope:
          credentials.scope ||
          "https://www.googleapis.com/auth/calendar.readonly",
      };

      console.log("Google access token refreshed successfully");
      return tokenData;
    } catch (error) {
      console.error("Error refreshing Google access token:", error);
      throw new Error(
        `Failed to refresh access token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Fetches meetings from Google Calendar
   * @param accessToken - Valid access token
   * @param calendarId - Calendar ID (default: 'primary')
   * @param timeMin - Start time for search (ISO string)
   * @param timeMax - End time for search (ISO string)
   * @returns Array of calendar meetings
   */
  public async fetchMeetings(
    accessToken: string,
    calendarId: string = "primary",
    timeMin: string,
    timeMax: string
  ): Promise<CalendarMeeting[]> {
    try {
      // Set up authenticated client
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const calendar = google.calendar({
        version: "v3",
        auth: this.oauth2Client,
      });

      const response = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        fields:
          "items(id,summary,start,end,attendees(email,responseStatus,displayName))",
      });

      const events = response.data.items || [];

      const meetings: CalendarMeeting[] = events
        .filter((event) => event.start && event.end) // Only events with valid times
        .map((event) => {
          const attendees: CalendarAttendee[] = (event.attendees || []).map(
            (attendee) => ({
              email: attendee.email || "",
              responseStatus:
                (attendee.responseStatus as CalendarAttendee["responseStatus"]) ||
                "needsAction",
              displayName: attendee.displayName || undefined,
            })
          );

          return {
            id: event.id || "",
            title: event.summary || "Untitled Event",
            startTime: event.start?.dateTime || event.start?.date || "",
            endTime: event.end?.dateTime || event.end?.date || "",
            attendees,
          };
        });

      console.log(`Fetched ${meetings.length} meetings from Google Calendar`);
      return meetings;
    } catch (error) {
      console.error("Error fetching Google Calendar meetings:", error);

      // Handle specific API errors
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error("Access token expired or invalid");
        }
        if (error.response?.status === 403) {
          throw new Error("Insufficient permissions to access calendar");
        }
        if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded");
        }
      }

      throw new Error(
        `Failed to fetch calendar meetings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Revokes Google API access for the given token
   * @param accessToken - Access token to revoke
   * @returns Success status
   */
  public async revokeAuth(accessToken: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.revokeUrl}?token=${accessToken}`,
        {},
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log("Google access token revoked successfully");
      return true;
    } catch (error) {
      console.error("Error revoking Google access token:", error);

      // Even if revoke fails, we should consider it partially successful
      // The token might already be expired or invalid
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        console.log("Token was already invalid or expired");
        return true;
      }

      throw new Error(
        `Failed to revoke access token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Helper method to make authenticated API calls
   * @param endpoint - API endpoint path
   * @param accessToken - Valid access token
   * @param params - Query parameters
   * @returns API response data
   */
  private async makeAuthenticatedRequest(
    endpoint: string,
    accessToken: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        params,
      });

      return response.data;
    } catch (error) {
      console.error(
        `Error making authenticated request to ${endpoint}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Validates if an access token is still valid
   * @param accessToken - Access token to validate
   * @returns Whether the token is valid
   */
  public async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest(
        "/users/me/calendarList",
        accessToken
      );
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();
