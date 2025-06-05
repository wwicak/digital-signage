/**
 * @fileoverview Unit tests for OutlookCalendarService
 */

import axios from "axios";
import {
  OutlookCalendarService,
  outlookCalendarService,
} from "../../../api/services/outlook_calendar_service";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
const mockEnvVars = {
  OUTLOOK_CLIENT_ID: "test-client-id",
  OUTLOOK_CLIENT_SECRET: "test-client-secret",
  OUTLOOK_TENANT_ID: "test-tenant-id",
  OUTLOOK_CALLBACK_URL: "/api/v1/calendar/outlook/callback",
};

describe("OutlookCalendarService", () => {
  let service: OutlookCalendarService;

  beforeEach(() => {
    // Set up environment variables
    Object.assign(process.env, mockEnvVars);

    // Reset mocks
    jest.clearAllMocks();

    // Create new service instance
    service = new OutlookCalendarService();
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnvVars).forEach((key) => {
      delete process.env[key];
    });
  });

  describe("constructor", () => {
    it("should throw error when client credentials are missing", () => {
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_SECRET;

      expect(() => new OutlookCalendarService()).toThrow(
        "Microsoft Outlook OAuth credentials not configured"
      );
    });

    it("should initialize with environment variables", () => {
      expect(() => new OutlookCalendarService()).not.toThrow();
    });
  });

  describe("initiateAuth", () => {
    it("should generate correct authorization URL", () => {
      const userId = "test-user-123";
      const result = service.initiateAuth(userId);

      expect(result.authUrl).toContain("login.microsoftonline.com");
      expect(result.authUrl).toContain("test-tenant-id");
      expect(result.authUrl).toContain("test-client-id");
      expect(result.authUrl).toContain("Calendars.Read");
      expect(result.authUrl).toContain("offline_access");
      expect(result.authUrl).toContain(`state=${userId}`);
      expect(result.state).toBe(userId);
    });

    it("should handle errors gracefully", () => {
      // Mock console.error to avoid output during tests
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Force an error by corrupting the service state
      (service as any).clientId = "";

      expect(() => service.initiateAuth("test-user")).toThrow(
        "Failed to generate authorization URL"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("handleAuthCallback", () => {
    const mockTokenResponse = {
      data: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        scope: "Calendars.Read offline_access",
      },
    };

    const mockProfileResponse = {
      data: {
        id: "user-123",
        mail: "user@example.com",
        displayName: "Test User",
      },
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue(mockTokenResponse);
      mockedAxios.get.mockResolvedValue(mockProfileResponse);
    });

    it("should exchange code for tokens and get user profile", async () => {
      const code = "auth-code-123";
      const userId = "user-123";

      const result = await service.handleAuthCallback(code, userId);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("oauth2/v2.0/token"),
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/me"),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        })
      );

      expect(result.tokens.access_token).toBe("mock-access-token");
      expect(result.tokens.refresh_token).toBe("mock-refresh-token");
      expect(result.profile.email).toBe("user@example.com");
      expect(result.profile.name).toBe("Test User");
    });

    it("should handle missing access token", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { refresh_token: "mock-refresh-token" },
      });

      await expect(service.handleAuthCallback("code", "user")).rejects.toThrow(
        "No access token received from Microsoft"
      );
    });

    it("should handle API errors", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Network error"));

      await expect(service.handleAuthCallback("code", "user")).rejects.toThrow(
        "Failed to exchange authorization code"
      );
    });
  });

  describe("refreshToken", () => {
    const mockRefreshResponse = {
      data: {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        expires_in: 3600,
        scope: "Calendars.Read offline_access",
      },
    };

    beforeEach(() => {
      mockedAxios.post.mockResolvedValue(mockRefreshResponse);
    });

    it("should refresh access token successfully", async () => {
      const refreshToken = "old-refresh-token";

      const result = await service.refreshToken(refreshToken);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("oauth2/v2.0/token"),
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
      );

      expect(result.access_token).toBe("new-access-token");
      expect(result.refresh_token).toBe("new-refresh-token");
    });

    it("should handle missing access token in refresh response", async () => {
      mockedAxios.post.mockResolvedValue({
        data: { refresh_token: "new-refresh-token" },
      });

      await expect(service.refreshToken("old-token")).rejects.toThrow(
        "No access token received from refresh"
      );
    });

    it("should handle refresh errors", async () => {
      mockedAxios.post.mockRejectedValue(new Error("Invalid refresh token"));

      await expect(service.refreshToken("invalid-token")).rejects.toThrow(
        "Failed to refresh access token"
      );
    });
  });

  describe("fetchMeetings", () => {
    const mockMeetingsResponse = {
      data: {
        value: [
          {
            id: "meeting-1",
            subject: "Test Meeting 1",
            start: { dateTime: "2023-12-01T10:00:00Z" },
            end: { dateTime: "2023-12-01T11:00:00Z" },
            attendees: [
              {
                emailAddress: { address: "user1@example.com", name: "User 1" },
                status: { response: "accepted" },
              },
            ],
          },
          {
            id: "meeting-2",
            subject: "Test Meeting 2",
            start: { dateTime: "2023-12-01T14:00:00Z" },
            end: { dateTime: "2023-12-01T15:00:00Z" },
            attendees: [],
          },
        ],
      },
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue(mockMeetingsResponse);
    });

    it("should fetch meetings successfully", async () => {
      const accessToken = "valid-access-token";
      const timeMin = "2023-12-01T00:00:00Z";
      const timeMax = "2023-12-01T23:59:59Z";

      const result = await service.fetchMeetings(
        accessToken,
        "primary",
        timeMin,
        timeMax
      );

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/me/calendarview"),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer valid-access-token",
            "Content-Type": "application/json",
          },
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("meeting-1");
      expect(result[0].title).toBe("Test Meeting 1");
      expect(result[0].attendees).toHaveLength(1);
      expect(result[0].attendees[0].email).toBe("user1@example.com");
      expect(result[0].attendees[0].responseStatus).toBe("accepted");
    });

    it("should handle pagination", async () => {
      const firstPageResponse = {
        data: {
          value: [mockMeetingsResponse.data.value[0]],
          "@odata.nextLink":
            "https://graph.microsoft.com/v1.0/me/calendarview?$skip=1",
        },
      };

      const secondPageResponse = {
        data: {
          value: [mockMeetingsResponse.data.value[1]],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const result = await service.fetchMeetings(
        "token",
        "primary",
        "2023-12-01T00:00:00Z",
        "2023-12-01T23:59:59Z"
      );

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it("should handle 401 unauthorized errors", async () => {
      const unauthorizedError = {
        response: { status: 401 },
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValue(unauthorizedError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        service.fetchMeetings("invalid-token", "primary", "start", "end")
      ).rejects.toThrow("Access token expired or invalid");
    });

    it("should handle 429 rate limit errors", async () => {
      const rateLimitError = {
        response: {
          status: 429,
          headers: { "retry-after": "60" },
        },
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValue(rateLimitError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        service.fetchMeetings("token", "primary", "start", "end")
      ).rejects.toThrow("Rate limit exceeded. Retry after 60 seconds");
    });
  });

  describe("validateToken", () => {
    it("should return true for valid token", async () => {
      mockedAxios.get.mockResolvedValue({ data: { id: "user-123" } });

      const isValid = await service.validateToken("valid-token");

      expect(isValid).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/me"),
        expect.objectContaining({
          headers: {
            Authorization: "Bearer valid-token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should return false for invalid token", async () => {
      const unauthorizedError = {
        response: { status: 401 },
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValue(unauthorizedError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const isValid = await service.validateToken("invalid-token");

      expect(isValid).toBe(false);
    });

    it("should throw other errors", async () => {
      const serverError = new Error("Server error");
      mockedAxios.get.mockRejectedValue(serverError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(service.validateToken("token")).rejects.toThrow(
        "Server error"
      );
    });
  });

  describe("revokeAuth", () => {
    it("should return true (no actual revocation for Microsoft)", async () => {
      const result = await service.revokeAuth("access-token");
      expect(result).toBe(true);
    });
  });

  describe("singleton export", () => {
    it("should not export singleton instance in test environment", () => {
      expect(outlookCalendarService).toBeNull();
    });
  });

  describe("response status mapping", () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({
        data: {
          value: [
            {
              id: "meeting-1",
              subject: "Test Meeting",
              start: { dateTime: "2023-12-01T10:00:00Z" },
              end: { dateTime: "2023-12-01T11:00:00Z" },
              attendees: [
                {
                  emailAddress: { address: "user1@example.com" },
                  status: { response: "accepted" },
                },
                {
                  emailAddress: { address: "user2@example.com" },
                  status: { response: "declined" },
                },
                {
                  emailAddress: { address: "user3@example.com" },
                  status: { response: "tentativelyAccepted" },
                },
                {
                  emailAddress: { address: "user4@example.com" },
                  status: { response: "organizer" },
                },
                {
                  emailAddress: { address: "user5@example.com" },
                  status: { response: "none" },
                },
              ],
            },
          ],
        },
      });
    });

    it("should map Microsoft response statuses correctly", async () => {
      const result = await service.fetchMeetings(
        "token",
        "primary",
        "start",
        "end"
      );

      const attendees = result[0].attendees;
      expect(attendees[0].responseStatus).toBe("accepted");
      expect(attendees[1].responseStatus).toBe("declined");
      expect(attendees[2].responseStatus).toBe("tentativelyAccepted");
      expect(attendees[3].responseStatus).toBe("organizer");
      expect(attendees[4].responseStatus).toBe("notResponded");
    });
  });
});
