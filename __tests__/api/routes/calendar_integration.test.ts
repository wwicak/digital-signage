/**
 * @fileoverview Tests for Calendar Integration API Routes
 * Tests OAuth flows, calendar link management, and authentication
 */

import request from "supertest";
import express from "express";
import session from "express-session";
import passport from "passport";
import mongoose from "mongoose";
import calendarIntegrationRoutes from "../../../api/routes/calendar_integration";
import UserCalendarLink from "../../../api/models/UserCalendarLink";
import { OutlookCalendarService } from "../../../api/services/outlook_calendar_service";

// Mock dependencies
jest.mock("../../../api/models/UserCalendarLink");
jest.mock("../../../api/services/outlook_calendar_service");
jest.mock("passport");

const MockedUserCalendarLink = UserCalendarLink as jest.Mocked<
  typeof UserCalendarLink
>;
const MockedOutlookCalendarService = OutlookCalendarService as jest.MockedClass<
  typeof OutlookCalendarService
>;

// Test app setup
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "test-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Mock passport middleware following existing patterns
app.use((req: any, res, next) => {
  req.user = {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
    email: "test@example.com",
  };
  req.isAuthenticated = jest.fn(() => !!req.user);
  req.login = jest.fn((user: any, options: any, callback?: any) => {
    if (typeof options === "function") {
      callback = options;
    }
    if (callback) {
      req.user = user;
      return callback(null);
    }
  });
  req.logout = jest.fn();
  next();
});

app.use("/api/v1/calendar", calendarIntegrationRoutes);

describe("Calendar Integration Routes", () => {
  let mockOutlookService: jest.Mocked<OutlookCalendarService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup OutlookCalendarService mock
    mockOutlookService = {
      initiateAuth: jest.fn(),
      handleAuthCallback: jest.fn(),
      revokeAuth: jest.fn(),
      validateToken: jest.fn(),
      refreshToken: jest.fn(),
      fetchMeetings: jest.fn(),
    } as any;

    MockedOutlookCalendarService.mockImplementation(() => mockOutlookService);
  });

  describe("GET /api/v1/calendar/outlook/authorize", () => {
    it("should redirect to Microsoft OAuth URL for authenticated user", async () => {
      const mockAuthResponse = {
        authUrl:
          "https://login.microsoftonline.com/oauth/authorize?client_id=test",
        state: "507f1f77bcf86cd799439011",
      };
      mockOutlookService.initiateAuth.mockReturnValue(mockAuthResponse);

      const response = await request(app)
        .get("/api/v1/calendar/outlook/authorize")
        .expect(302);

      expect(response.headers.location).toBe(mockAuthResponse.authUrl);
      expect(mockOutlookService.initiateAuth).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011"
      );
    });

    it("should return 401 when user is not authenticated", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, res, next) => {
        req.isAuthenticated = jest.fn(() => false);
        next();
      });
      testApp.use("/api/v1/calendar", calendarIntegrationRoutes);

      const response = await request(testApp)
        .get("/api/v1/calendar/outlook/authorize")
        .expect(401);

      expect(response.body.message).toBe("User not authenticated");
    });

    it("should return 401 when user session is invalid", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, res, next) => {
        req.user = undefined;
        req.isAuthenticated = jest.fn(() => true);
        next();
      });
      testApp.use("/api/v1/calendar", calendarIntegrationRoutes);

      const response = await request(testApp)
        .get("/api/v1/calendar/outlook/authorize")
        .expect(401);

      expect(response.body.message).toBe("User session invalid");
    });

    it("should handle service errors gracefully", async () => {
      mockOutlookService.initiateAuth.mockImplementation(() => {
        throw new Error("OAuth configuration error");
      });

      const response = await request(app)
        .get("/api/v1/calendar/outlook/authorize")
        .expect(500);

      expect(response.body.message).toBe(
        "Failed to initiate calendar authorization"
      );
      expect(response.body.error).toBe("OAuth configuration error");
    });
  });

  describe("GET /api/v1/calendar/outlook/callback", () => {
    const mockCalendarLink = {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      provider: "outlook",
      externalUserId: "test-external-id",
      calendarId: "primary",
      accessToken: "encrypted-access-token",
      refreshToken: "encrypted-refresh-token",
      isActive: true,
      save: jest.fn(),
    };

    beforeEach(() => {
      // Mock passport authenticate middleware
      jest
        .spyOn(passport, "authenticate")
        .mockImplementation((strategy, options) => {
          return (req: any, res: any, next: any) => {
            // Simulate successful authentication
            req.user = {
              profile: {
                id: "test-external-id",
                email: "test@outlook.com",
                name: "Test User",
              },
              tokens: {
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
                expires_at: Date.now() + 3600000,
                scope: "Calendars.Read offline_access",
              },
            };
            next();
          };
        });
    });

    it("should handle successful OAuth callback and create calendar link", async () => {
      MockedUserCalendarLink.findOne.mockResolvedValue(null);

      const mockSave = jest.fn().mockResolvedValue(mockCalendarLink);
      (MockedUserCalendarLink as any).mockImplementation(() => ({
        ...mockCalendarLink,
        save: mockSave,
      }));

      const response = await request(app)
        .get("/api/v1/calendar/outlook/callback")
        .query({ state: "507f1f77bcf86cd799439011" })
        .expect(302);

      expect(response.headers.location).toBe(
        "/settings/integrations?status=outlook_success"
      );
      expect(MockedUserCalendarLink.findOne).toHaveBeenCalledWith({
        userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        provider: "outlook",
        externalUserId: "test-external-id",
      });
    });

    it("should update existing calendar link if one exists", async () => {
      const existingLink = {
        ...mockCalendarLink,
        save: jest.fn().mockResolvedValue(mockCalendarLink),
      };
      MockedUserCalendarLink.findOne.mockResolvedValue(existingLink as any);

      const response = await request(app)
        .get("/api/v1/calendar/outlook/callback")
        .query({ state: "507f1f77bcf86cd799439011" })
        .expect(302);

      expect(response.headers.location).toBe(
        "/settings/integrations?status=outlook_success"
      );
      expect(existingLink.save).toHaveBeenCalled();
    });

    it("should redirect to error page when state parameter is missing", async () => {
      const response = await request(app)
        .get("/api/v1/calendar/outlook/callback")
        .expect(302);

      expect(response.headers.location).toBe(
        "/settings/integrations?status=outlook_error"
      );
    });

    it("should redirect to error page when userId is invalid", async () => {
      const response = await request(app)
        .get("/api/v1/calendar/outlook/callback")
        .query({ state: "invalid-user-id" })
        .expect(302);

      expect(response.headers.location).toBe(
        "/settings/integrations?status=outlook_error"
      );
    });
  });

  describe("GET /api/v1/calendar/google/authorize", () => {
    it("should return 501 for Google OAuth (not implemented)", async () => {
      const response = await request(app)
        .get("/api/v1/calendar/google/authorize")
        .expect(501);

      expect(response.body.message).toBe(
        "Google Calendar integration not yet implemented"
      );
      expect(response.body.provider).toBe("google");
    });
  });

  describe("GET /api/v1/calendar/google/callback", () => {
    it("should redirect to not implemented status", async () => {
      const response = await request(app)
        .get("/api/v1/calendar/google/callback")
        .expect(302);

      expect(response.headers.location).toBe(
        "/settings/integrations?status=google_not_implemented"
      );
    });
  });

  describe("GET /api/v1/calendar/links", () => {
    it("should return calendar links for authenticated user", async () => {
      const mockLinks = [
        {
          _id: new mongoose.Types.ObjectId(),
          provider: "outlook",
          externalUserId: "test-external-id",
          calendarId: "primary",
          scopes: ["Calendars.Read"],
          isActive: true,
          lastSyncStatus: "success",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      MockedUserCalendarLink.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockLinks),
      } as any);

      const response = await request(app)
        .get("/api/v1/calendar/links")
        .expect(200);

      expect(response.body.message).toBe(
        "Calendar links retrieved successfully"
      );
      expect(response.body.links).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.links[0].provider).toBe("outlook");
    });

    it("should return empty array when no links exist", async () => {
      MockedUserCalendarLink.find.mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      } as any);

      const response = await request(app)
        .get("/api/v1/calendar/links")
        .expect(200);

      expect(response.body.links).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it("should return 401 when user is not authenticated", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, res, next) => {
        req.isAuthenticated = jest.fn(() => false);
        next();
      });
      testApp.use("/api/v1/calendar", calendarIntegrationRoutes);

      const response = await request(testApp)
        .get("/api/v1/calendar/links")
        .expect(401);

      expect(response.body.message).toBe("User not authenticated");
    });
  });

  describe("DELETE /api/v1/calendar/links/:linkId", () => {
    const linkId = new mongoose.Types.ObjectId().toString();
    const mockCalendarLink = {
      _id: linkId,
      userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      provider: "outlook",
      getDecryptedAccessToken: jest.fn().mockReturnValue("decrypted-token"),
    };

    it("should delete calendar link successfully", async () => {
      MockedUserCalendarLink.findOne.mockResolvedValue(mockCalendarLink as any);
      MockedUserCalendarLink.findByIdAndDelete.mockResolvedValue(
        mockCalendarLink as any
      );
      mockOutlookService.revokeAuth.mockResolvedValue(true);

      const response = await request(app)
        .delete(`/api/v1/calendar/links/${linkId}`)
        .expect(200);

      expect(response.body.message).toBe("Calendar link removed successfully");
      expect(response.body.linkId).toBe(linkId);
      expect(mockOutlookService.revokeAuth).toHaveBeenCalledWith(
        "decrypted-token"
      );
      expect(MockedUserCalendarLink.findByIdAndDelete).toHaveBeenCalledWith(
        linkId
      );
    });

    it("should continue deletion even if token revocation fails", async () => {
      MockedUserCalendarLink.findOne.mockResolvedValue(mockCalendarLink as any);
      MockedUserCalendarLink.findByIdAndDelete.mockResolvedValue(
        mockCalendarLink as any
      );
      mockOutlookService.revokeAuth.mockRejectedValue(
        new Error("Revocation failed")
      );

      const response = await request(app)
        .delete(`/api/v1/calendar/links/${linkId}`)
        .expect(200);

      expect(response.body.message).toBe("Calendar link removed successfully");
      expect(MockedUserCalendarLink.findByIdAndDelete).toHaveBeenCalledWith(
        linkId
      );
    });

    it("should return 400 for invalid link ID format", async () => {
      const response = await request(app)
        .delete("/api/v1/calendar/links/invalid-id")
        .expect(400);

      expect(response.body.message).toBe("Invalid link ID format");
    });

    it("should return 404 when calendar link not found", async () => {
      MockedUserCalendarLink.findOne.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/v1/calendar/links/${linkId}`)
        .expect(404);

      expect(response.body.message).toBe("Calendar link not found");
    });

    it("should return 401 when user is not authenticated", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, res, next) => {
        req.isAuthenticated = jest.fn(() => false);
        next();
      });
      testApp.use("/api/v1/calendar", calendarIntegrationRoutes);

      const response = await request(testApp)
        .delete(`/api/v1/calendar/links/${linkId}`)
        .expect(401);

      expect(response.body.message).toBe("User not authenticated");
    });
  });

  describe("POST /api/v1/calendar/links/:linkId/sync", () => {
    const linkId = new mongoose.Types.ObjectId().toString();
    const mockCalendarLink = {
      _id: linkId,
      userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
      provider: "outlook",
      isActive: true,
    };

    it("should return placeholder response for manual sync", async () => {
      MockedUserCalendarLink.findOne.mockResolvedValue(mockCalendarLink as any);

      const response = await request(app)
        .post(`/api/v1/calendar/links/${linkId}/sync`)
        .expect(200);

      expect(response.body.message).toBe(
        "Manual sync functionality not yet implemented"
      );
      expect(response.body.linkId).toBe(linkId);
      expect(response.body.provider).toBe("outlook");
      expect(response.body.status).toBe("pending");
    });

    it("should return 400 for invalid link ID format", async () => {
      const response = await request(app)
        .post("/api/v1/calendar/links/invalid-id/sync")
        .expect(400);

      expect(response.body.message).toBe("Invalid link ID format");
    });

    it("should return 404 when active calendar link not found", async () => {
      MockedUserCalendarLink.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/calendar/links/${linkId}/sync`)
        .expect(404);

      expect(response.body.message).toBe("Active calendar link not found");
    });

    it("should return 401 when user is not authenticated", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.use((req: any, res, next) => {
        req.isAuthenticated = jest.fn(() => false);
        next();
      });
      testApp.use("/api/v1/calendar", calendarIntegrationRoutes);

      const response = await request(testApp)
        .post(`/api/v1/calendar/links/${linkId}/sync`)
        .expect(401);

      expect(response.body.message).toBe("User not authenticated");
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors in links endpoint", async () => {
      MockedUserCalendarLink.find.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error("Database error")),
      } as any);

      const response = await request(app)
        .get("/api/v1/calendar/links")
        .expect(500);

      expect(response.body.message).toBe("Failed to fetch calendar links");
      expect(response.body.error).toBe("Database error");
    });

    it("should handle database errors in delete endpoint", async () => {
      const linkId = new mongoose.Types.ObjectId().toString();
      MockedUserCalendarLink.findOne.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app)
        .delete(`/api/v1/calendar/links/${linkId}`)
        .expect(500);

      expect(response.body.message).toBe("Failed to remove calendar link");
      expect(response.body.error).toBe("Database error");
    });
  });
});
