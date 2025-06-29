/**
 * @fileoverview Microsoft Outlook Calendar Integration Service
 * Handles Microsoft Graph API operations including authentication and meeting retrieval
 */

import axios, { AxiosError } from "axios";

/**
 * Interface for Microsoft OAuth tokens
 */
export interface OutlookTokens {
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
  responseStatus:
    | "none"
    | "organizer"
    | "tentativelyAccepted"
    | "accepted"
    | "declined"
    | "notResponded";
  displayName?: string;
}

/**
 * Microsoft Graph API Event interface (partial)
 */
interface GraphEvent {
  id: string;
  subject: string;
  start?: {
    dateTime: string;
    timeZone: string;
  };
  end?: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress?: {
      address?: string;
      name?: string;
    };
    status?: {
      response?: string;
    };
  }>;
}

/**
 * Microsoft Graph API response interface
 */
interface GraphApiResponse {
  value: GraphEvent[];
  '@odata.nextLink'?: string;
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
  tokens: OutlookTokens;
  profile: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Microsoft Outlook Calendar Service Class
 * Provides methods for Microsoft Outlook Calendar integration using Microsoft Graph API
 */
export class OutlookCalendarService {
  private readonly baseUrl = "https://graph.microsoft.com/v1.0";
  private readonly authUrl = "https://login.microsoftonline.com";
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = process.env.OUTLOOK_CLIENT_ID || "";
    this.clientSecret = process.env.OUTLOOK_CLIENT_SECRET || "";
    this.tenantId = process.env.OUTLOOK_TENANT_ID || "common";
    this.redirectUri =
      process.env.OUTLOOK_CALLBACK_URL || "/api/v1/calendar/outlook/callback";

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "Microsoft Outlook OAuth credentials not configured. Please set OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET environment variables."
      );
    }
  }

  /**
   * Initiates Microsoft OAuth flow and returns authorization URL
   * @param userId - The user ID to associate with the auth request
   * @returns Authorization URL and optional state parameter
   */
  public initiateAuth(userId: string): AuthInitiationResponse {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error("OAuth credentials not configured");
      }

      const scopes = [
        "openid",
        "profile",
        "email",
        "Calendars.Read",
        "offline_access",
      ];

      const params = new URLSearchParams({
        client_id: this.clientId,
        response_type: "code",
        redirect_uri: this.redirectUri,
        response_mode: "query",
        scope: scopes.join(" "),
        state: userId,
        prompt: "consent", // Force consent to get refresh token
      });

      const authUrl = `${this.authUrl}/${
        this.tenantId
      }/oauth2/v2.0/authorize?${params.toString()}`;

      console.log(`Generated Microsoft OAuth URL for user ${userId}`);

      return {
        authUrl,
        state: userId,
      };
    } catch (error) {
      console.error("Error generating Microsoft OAuth URL:", error);
      throw new Error("Failed to generate authorization URL");
    }
  }

  /**
   * Handles OAuth callback and exchanges authorization code for tokens
   * @param code - Authorization code from Microsoft
   * @param userId - User ID from state parameter
   * @returns Tokens and user profile information
   */
  public async handleAuthCallback(
    code: string,
    userId: string
  ): Promise<AuthCallbackResponse> {
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await axios.post(
        `${this.authUrl}/${this.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
          grant_type: "authorization_code",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const tokenData = tokenResponse.data;

      if (!tokenData.access_token) {
        throw new Error("No access token received from Microsoft");
      }

      // Get user profile information
      const profileResponse = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const profile = profileResponse.data;

      const tokens: OutlookTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || undefined,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        token_type: "Bearer",
        scope: tokenData.scope || "Calendars.Read offline_access",
      };

      console.log(
        `Microsoft OAuth callback successful for user ${userId}, email: ${
          profile.mail || profile.userPrincipalName
        }`
      );

      return {
        tokens,
        profile: {
          id: profile.id || "",
          email: profile.mail || profile.userPrincipalName || "",
          name: profile.displayName || "",
        },
      };
    } catch (error) {
      console.error("Error handling Microsoft OAuth callback:", error);
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
  public async refreshToken(refreshTokenValue: string): Promise<OutlookTokens> {
    try {
      const response = await axios.post(
        `${this.authUrl}/${this.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshTokenValue,
          grant_type: "refresh_token",
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const tokenData = response.data;

      if (!tokenData.access_token) {
        throw new Error("No access token received from refresh");
      }

      const tokens: OutlookTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshTokenValue,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        token_type: "Bearer",
        scope: tokenData.scope || "Calendars.Read offline_access",
      };

      console.log("Microsoft access token refreshed successfully");
      return tokens;
    } catch (error) {
      console.error("Error refreshing Microsoft access token:", error);
      throw new Error(
        `Failed to refresh access token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Fetches meetings from Microsoft Outlook Calendar
   * @param accessToken - Valid access token
   * @param calendarId - Calendar ID (default: 'primary' which maps to the user's default calendar)
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
      // For Microsoft Graph, we use the calendarview endpoint for the user's calendar
      // The 'primary' calendar is accessed via '/me/calendarview'
      const endpoint =
        calendarId === "primary"
          ? "/me/calendarview"
          : `/me/calendars/${calendarId}/calendarview`;

      const params = new URLSearchParams({
        startDateTime: timeMin,
        endDateTime: timeMax,
        $select: "id,subject,start,end,attendees",
        $orderby: "start/dateTime",
        $top: "1000", // Maximum events to retrieve
      });

      let allMeetings: CalendarMeeting[] = [];
      let nextLink: string | null = `${
        this.baseUrl
      }${endpoint}?${params.toString()}`;

      // Handle pagination
      while (nextLink) {
        const response = await this.makeAuthenticatedRequest(
          nextLink,
          accessToken
        );
        const meetings = this.transformMeetings(response.value || []);
        allMeetings = allMeetings.concat(meetings);

        // Check for next page
        nextLink = response["@odata.nextLink"] || null;
      }

      console.log(
        `Fetched ${allMeetings.length} meetings from Microsoft Outlook Calendar`
      );
      return allMeetings;
    } catch (error) {
      console.error(
        "Error fetching Microsoft Outlook Calendar meetings:",
        error
      );
      this.handleApiError(error);
      throw error;
    }
  }

  /**
   * Revokes Microsoft API access for the given token
   * Note: Microsoft Graph doesn't have a simple token revocation endpoint like Google
   * This method clears locally stored tokens and logs the action
   * @param accessToken - Access token to revoke (for logging purposes)
   * @returns Success status
   */
  public async revokeAuth(accessToken: string): Promise<boolean> {
    try {
      // Microsoft Graph API doesn't provide a simple token revocation endpoint
      // The recommended approach is to:
      // 1. Clear locally stored tokens (handled by the caller)
      // 2. Optionally redirect user to Microsoft logout URL
      // 3. Or use the enterprise app management if available

      console.log(
        "Microsoft access tokens should be cleared locally. Direct token revocation not available via API."
      );

      // For enterprise applications, you could potentially use:
      // POST https://graph.microsoft.com/v1.0/me/revokeSignInSessions
      // But this revokes ALL sessions for the user, not just this app

      return true;
    } catch (error) {
      console.error("Error in Microsoft token revocation process:", error);
      throw new Error(
        `Failed to revoke access: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Validates if an access token is still valid
   * @param accessToken - Access token to validate
   * @returns Whether the token is valid
   */
  public async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest(`${this.baseUrl}/me`, accessToken);
      return true;
    } catch (error) {
      if (this.isUnauthorizedError(error)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Helper method to make authenticated API calls
   * @param url - Full API URL
   * @param accessToken - Valid access token
   * @returns API response data
   */
  private async makeAuthenticatedRequest(
    url: string,
    accessToken: string
  ): Promise<GraphApiResponse> {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error making authenticated request to ${url}:`, error);
      throw error;
    }
  }

  /**
   * Transforms Microsoft Graph API meeting data to standard format
   * @param events - Raw events from Microsoft Graph API
   * @returns Transformed meetings array
   */
  private transformMeetings(events: GraphEvent[]): CalendarMeeting[] {
    return events
      .filter((event) => event.start && event.end) // Only events with valid times
      .map((event) => {
        const attendees: CalendarAttendee[] = (event.attendees || []).map(
          (attendee) => ({
            email: attendee.emailAddress?.address || "",
            responseStatus: this.mapResponseStatus(attendee.status?.response || "needsAction"),
            displayName: attendee.emailAddress?.name || "",
          })
        );

        return {
          id: event.id || "",
          title: event.subject || "Untitled Event",
          startTime: event.start?.dateTime || "",
          endTime: event.end?.dateTime || "",
          attendees,
        };
      });
  }

  /**
   * Maps Microsoft Graph response status to standard format
   * @param microsoftStatus - Microsoft Graph response status
   * @returns Standard response status
   */
  private mapResponseStatus(
    microsoftStatus: string
  ): CalendarAttendee["responseStatus"] {
    switch (microsoftStatus?.toLowerCase()) {
      case "accepted":
        return "accepted";
      case "declined":
        return "declined";
      case "tentativelyaccepted":
        return "tentativelyAccepted";
      case "organizer":
        return "organizer";
      case "none":
      case "notresponded":
      default:
        return "notResponded";
    }
  }

  /**
   * Handles API errors with specific Microsoft Graph error codes
   * @param error - The error to handle
   */
  private handleApiError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status === 401) {
        throw new Error("Access token expired or invalid");
      }
      if (status === 403) {
        throw new Error("Insufficient permissions to access calendar");
      }
      if (status === 429) {
        const retryAfter = axiosError.response?.headers["retry-after"];
        throw new Error(
          `Rate limit exceeded. Retry after ${retryAfter} seconds`
        );
      }
      if (status && status >= 500) {
        throw new Error("Microsoft Graph API server error");
      }
    }

    throw new Error(
      `Failed to fetch calendar meetings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  /**
   * Checks if an error is an unauthorized (401) error
   * @param error - The error to check
   * @returns Whether the error is unauthorized
   */
  private isUnauthorizedError(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 401;
  }
}

// Export singleton instance - only create if not in test environment
export const outlookCalendarService =
  process.env.NODE_ENV === "test" ? null : new OutlookCalendarService();
