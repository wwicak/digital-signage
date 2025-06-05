/**
 * @fileoverview Unit tests for Outlook OAuth strategy
 */

import passport from "passport";
import axios from "axios";
import {
  configureOutlookStrategy,
  configureOutlookSerialization,
  initializeOutlookAuth,
  OutlookProfile,
  OutlookTokens,
} from "../../../api/auth/outlook_strategy";

// Mock passport
jest.mock("passport");
const mockPassport = passport as jest.Mocked<typeof passport>;

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock passport-oauth2
jest.mock("passport-oauth2", () => ({
  Strategy: jest.fn().mockImplementation((options, verify) => ({
    options,
    verify,
    name: "oauth2",
  })),
}));

// Mock environment variables
const mockEnvVars = {
  OUTLOOK_CLIENT_ID: "test-client-id",
  OUTLOOK_CLIENT_SECRET: "test-client-secret",
  OUTLOOK_TENANT_ID: "test-tenant-id",
  OUTLOOK_CALLBACK_URL: "/api/v1/calendar/outlook/callback",
};

describe("Outlook OAuth Strategy", () => {
  beforeEach(() => {
    // Set up environment variables
    Object.assign(process.env, mockEnvVars);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnvVars).forEach((key) => {
      delete process.env[key];
    });
  });

  describe("configureOutlookStrategy", () => {
    it("should configure passport strategy with correct options", () => {
      configureOutlookStrategy();

      expect(mockPassport.use).toHaveBeenCalledWith(
        "microsoft",
        expect.objectContaining({
          options: expect.objectContaining({
            authorizationURL: expect.stringContaining(
              "login.microsoftonline.com"
            ),
            tokenURL: expect.stringContaining("oauth2/v2.0/token"),
            clientID: "test-client-id",
            clientSecret: "test-client-secret",
            callbackURL: "/api/v1/calendar/outlook/callback",
            scope: expect.arrayContaining([
              "openid",
              "profile",
              "email",
              "Calendars.Read",
              "offline_access",
            ]),
          }),
        })
      );
    });

    it("should use default tenant when OUTLOOK_TENANT_ID is not set", () => {
      delete process.env.OUTLOOK_TENANT_ID;

      configureOutlookStrategy();

      expect(mockPassport.use).toHaveBeenCalledWith(
        "microsoft",
        expect.objectContaining({
          options: expect.objectContaining({
            authorizationURL: expect.stringContaining("common"),
            tokenURL: expect.stringContaining("common"),
          }),
        })
      );
    });

    it("should use default callback URL when OUTLOOK_CALLBACK_URL is not set", () => {
      delete process.env.OUTLOOK_CALLBACK_URL;

      configureOutlookStrategy();

      expect(mockPassport.use).toHaveBeenCalledWith(
        "microsoft",
        expect.objectContaining({
          options: expect.objectContaining({
            callbackURL: "/api/v1/calendar/outlook/callback",
          }),
        })
      );
    });

    it("should not configure strategy when credentials are missing", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_SECRET;

      configureOutlookStrategy();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Microsoft Outlook OAuth credentials not found")
      );
      expect(mockPassport.use).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("strategy verify callback", () => {
    let verifyCallback: any;
    const mockUserProfile = {
      id: "user-123",
      mail: "user@example.com",
      displayName: "Test User",
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({ data: mockUserProfile });

      configureOutlookStrategy();

      // Extract the verify callback from the passport.use call
      const passportUseCall = mockPassport.use.mock.calls.find(
        (call) => call[0] === "microsoft"
      );
      verifyCallback = (passportUseCall?.[1] as any)?.verify;
    });

    it("should successfully process valid OAuth response", async () => {
      const accessToken = "mock-access-token";
      const refreshToken = "mock-refresh-token";
      const profile = {}; // Not used in our implementation
      const done = jest.fn();

      await verifyCallback(accessToken, refreshToken, profile, done);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me",
        {
          headers: {
            Authorization: "Bearer mock-access-token",
          },
        }
      );

      expect(done).toHaveBeenCalledWith(null, {
        profile: {
          id: "user-123",
          email: "user@example.com",
          name: "Test User",
          picture: undefined,
        },
        tokens: {
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          token_type: "Bearer",
          scope: "Calendars.Read offline_access",
          expires_at: expect.any(Number),
        },
      });
    });

    it("should use userPrincipalName when mail is not available", async () => {
      const profileWithoutMail = {
        id: "user-123",
        userPrincipalName: "user@company.onmicrosoft.com",
        displayName: "Test User",
      };
      mockedAxios.get.mockResolvedValue({ data: profileWithoutMail });

      const done = jest.fn();
      await verifyCallback("token", "refresh", {}, done);

      expect(done).toHaveBeenCalledWith(null, {
        profile: expect.objectContaining({
          email: "user@company.onmicrosoft.com",
        }),
        tokens: expect.any(Object),
      });
    });

    it("should handle API errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      mockedAxios.get.mockRejectedValue(new Error("API Error"));

      const done = jest.fn();
      await verifyCallback("token", "refresh", {}, done);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error in Microsoft Outlook OAuth verify callback:",
        expect.any(Error)
      );
      expect(done).toHaveBeenCalledWith(expect.any(Error), false);

      consoleSpy.mockRestore();
    });
  });

  describe("configureOutlookSerialization", () => {
    it("should configure passport serialization", () => {
      configureOutlookSerialization();

      expect(mockPassport.serializeUser).toHaveBeenCalled();
      expect(mockPassport.deserializeUser).toHaveBeenCalled();
    });

    it("should serialize user correctly", () => {
      configureOutlookSerialization();

      const serializeCallback = mockPassport.serializeUser.mock
        .calls[0][0] as any;
      const done = jest.fn();

      const user = {
        profile: { id: "user-123" },
      };

      serializeCallback(user, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: "user-123",
        source: "microsoft",
      });
    });

    it("should serialize user with fallback id", () => {
      configureOutlookSerialization();

      const serializeCallback = mockPassport.serializeUser.mock
        .calls[0][0] as any;
      const done = jest.fn();

      const user = {
        id: "user-456",
      };

      serializeCallback(user, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: "user-456",
        source: "microsoft",
      });
    });

    it("should deserialize user correctly", () => {
      configureOutlookSerialization();

      const deserializeCallback = mockPassport.deserializeUser.mock
        .calls[0][0] as any;
      const done = jest.fn();

      const sessionUser = {
        id: "user-123",
        source: "microsoft",
      };

      deserializeCallback(sessionUser, done);

      expect(done).toHaveBeenCalledWith(null, sessionUser);
    });
  });

  describe("initializeOutlookAuth", () => {
    it("should initialize both strategy and serialization", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      initializeOutlookAuth();

      expect(mockPassport.use).toHaveBeenCalled();
      expect(mockPassport.serializeUser).toHaveBeenCalled();
      expect(mockPassport.deserializeUser).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Microsoft Outlook OAuth strategy initialized"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("TypeScript interfaces", () => {
    it("should have correct OutlookProfile interface", () => {
      const profile: OutlookProfile = {
        id: "user-123",
        email: "user@example.com",
        name: "Test User",
        picture: "https://example.com/avatar.jpg",
      };

      expect(profile.id).toBe("user-123");
      expect(profile.email).toBe("user@example.com");
      expect(profile.name).toBe("Test User");
      expect(profile.picture).toBe("https://example.com/avatar.jpg");
    });

    it("should have correct OutlookTokens interface", () => {
      const tokens: OutlookTokens = {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_at: Date.now() + 3600000,
        token_type: "Bearer",
        scope: "Calendars.Read offline_access",
      };

      expect(tokens.access_token).toBe("access-token");
      expect(tokens.refresh_token).toBe("refresh-token");
      expect(typeof tokens.expires_at).toBe("number");
      expect(tokens.token_type).toBe("Bearer");
      expect(tokens.scope).toBe("Calendars.Read offline_access");
    });
  });
});
