/**
 * @fileoverview Calendar Integration API Routes
 * Handles OAuth flows and calendar link management for Google and Outlook calendars
 */

import express, { Request, Response, NextFunction, Router } from "express";
import passport from "passport";
import mongoose from "mongoose";
import { OutlookCalendarService } from "../services/outlook_calendar_service";
import UserCalendarLink, {
  IUserCalendarLink,
} from "../models/UserCalendarLink";
import { IUser } from "../models/User";

const router: Router = express.Router();

// Initialize calendar services
const outlookService = new OutlookCalendarService();

// Middleware to ensure user is authenticated
const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "User not authenticated" });
};

// ===== OUTLOOK CALENDAR INTEGRATION =====

/**
 * GET /api/v1/calendar/outlook/authorize
 * Initiates Microsoft OAuth flow by redirecting to Microsoft authorization URL
 */
router.get(
  "/outlook/authorize",
  ensureAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      if (!user || !user._id) {
        res.status(401).json({ message: "User session invalid" });
        return;
      }

      const authResponse = outlookService.initiateAuth(user._id.toString());

      // Redirect user to Microsoft OAuth URL
      res.redirect(authResponse.authUrl);
    } catch (error) {
      console.error("Error initiating Outlook OAuth:", error);
      res.status(500).json({
        message: "Failed to initiate calendar authorization",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/calendar/outlook/callback
 * Handles OAuth callback from Microsoft and stores calendar link
 */
router.get(
  "/outlook/callback",
  passport.authenticate("microsoft", {
    session: false,
    failureRedirect: "/settings/integrations?status=outlook_error",
  }),
  async (req: Request, res: Response) => {
    try {
      // Get the user data from Passport authentication
      const passportData = req.user as any;
      if (!passportData || !passportData.profile || !passportData.tokens) {
        throw new Error("Missing authentication data from Microsoft");
      }

      const { profile, tokens } = passportData;

      // Get userId from state parameter (passed in OAuth flow)
      const userId = req.query.state as string;
      if (!userId) {
        throw new Error("Missing user ID in OAuth state parameter");
      }

      // Validate userId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID format");
      }

      // Create or update UserCalendarLink record
      const calendarLinkData = {
        userId: new mongoose.Types.ObjectId(userId),
        provider: "outlook" as const,
        externalUserId: profile.id,
        calendarId: "primary", // Outlook uses 'primary' for default calendar
        accessToken: tokens.access_token, // Will be encrypted by pre-save middleware
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiryDate: tokens.expires_at
          ? new Date(tokens.expires_at)
          : undefined,
        scopes: tokens.scope
          ? tokens.scope.split(" ")
          : ["Calendars.Read", "offline_access"],
        isActive: true,
      };

      // Find existing link or create new one
      const existingLink = await UserCalendarLink.findOne({
        userId: calendarLinkData.userId,
        provider: "outlook",
        externalUserId: profile.id,
      });

      let calendarLink: IUserCalendarLink;
      if (existingLink) {
        // Update existing link
        Object.assign(existingLink, calendarLinkData);
        calendarLink = await existingLink.save();
        console.log(
          `Updated existing Outlook calendar link for user ${userId}`
        );
      } else {
        // Create new link
        calendarLink = new UserCalendarLink(calendarLinkData);
        calendarLink = await calendarLink.save();
        console.log(`Created new Outlook calendar link for user ${userId}`);
      }

      // Redirect to success page
      res.redirect("/settings/integrations?status=outlook_success");
    } catch (error) {
      console.error("Error handling Outlook OAuth callback:", error);
      res.redirect("/settings/integrations?status=outlook_error");
    }
  }
);

// ===== GOOGLE CALENDAR INTEGRATION (PLACEHOLDER) =====

/**
 * GET /api/v1/calendar/google/authorize
 * Placeholder for Google OAuth flow
 */
router.get(
  "/google/authorize",
  ensureAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // TODO: Implement Google OAuth initiation when GoogleCalendarService is ready
      res.status(501).json({
        message: "Google Calendar integration not yet implemented",
        provider: "google",
      });
    } catch (error) {
      console.error("Error initiating Google OAuth:", error);
      res.status(500).json({
        message: "Failed to initiate Google calendar authorization",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/v1/calendar/google/callback
 * Placeholder for Google OAuth callback
 */
router.get(
  "/google/callback",
  // TODO: Add passport.authenticate("google") when strategy is implemented
  async (req: Request, res: Response): Promise<void> => {
    try {
      // TODO: Implement Google OAuth callback handling
      res.redirect("/settings/integrations?status=google_not_implemented");
    } catch (error) {
      console.error("Error handling Google OAuth callback:", error);
      res.redirect("/settings/integrations?status=google_error");
    }
  }
);

// ===== CALENDAR LINK MANAGEMENT =====

/**
 * GET /api/v1/calendar/links
 * Fetches all calendar links for the authenticated user
 */
router.get(
  "/links",
  ensureAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      if (!user || !user._id) {
        res.status(401).json({ message: "User session invalid" });
        return;
      }

      const calendarLinks = await UserCalendarLink.find({
        userId: user._id,
      }).select("-accessToken -refreshToken"); // Exclude sensitive tokens

      // Transform for frontend response
      const linksResponse = calendarLinks.map((link) => ({
        _id: link._id,
        provider: link.provider,
        externalUserId: link.externalUserId,
        calendarId: link.calendarId,
        scopes: link.scopes,
        isActive: link.isActive,
        lastSyncStatus: link.lastSyncStatus,
        lastSyncError: link.lastSyncError,
        lastSyncedAt: link.lastSyncedAt,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
      }));

      res.json({
        message: "Calendar links retrieved successfully",
        links: linksResponse,
        total: linksResponse.length,
      });
    } catch (error) {
      console.error("Error fetching calendar links:", error);
      res.status(500).json({
        message: "Failed to fetch calendar links",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * DELETE /api/v1/calendar/links/:linkId
 * Removes a calendar link and revokes access if possible
 */
router.delete(
  "/links/:linkId",
  ensureAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const { linkId } = req.params;

      if (!user || !user._id) {
        res.status(401).json({ message: "User session invalid" });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        res.status(400).json({ message: "Invalid link ID format" });
        return;
      }

      // Find the calendar link and ensure it belongs to the user
      const calendarLink = await UserCalendarLink.findOne({
        _id: linkId,
        userId: user._id,
      });

      if (!calendarLink) {
        res.status(404).json({ message: "Calendar link not found" });
        return;
      }

      // Attempt to revoke access token if it's an Outlook calendar
      if (calendarLink.provider === "outlook") {
        try {
          const decryptedAccessToken = calendarLink.getDecryptedAccessToken();
          await outlookService.revokeAuth(decryptedAccessToken);
          console.log(`Revoked Outlook access for link ${linkId}`);
        } catch (revokeError) {
          console.warn(
            `Could not revoke Outlook access for link ${linkId}:`,
            revokeError
          );
          // Continue with deletion even if revocation fails
        }
      }
      // TODO: Add Google revocation when GoogleCalendarService is implemented

      // Delete the calendar link
      await UserCalendarLink.findByIdAndDelete(linkId);

      console.log(`Deleted calendar link ${linkId} for user ${user._id}`);
      res.json({
        message: "Calendar link removed successfully",
        linkId,
      });
    } catch (error) {
      console.error("Error removing calendar link:", error);
      res.status(500).json({
        message: "Failed to remove calendar link",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/v1/calendar/links/:linkId/sync
 * Triggers manual sync for a specific calendar link (placeholder implementation)
 */
router.post(
  "/links/:linkId/sync",
  ensureAuthenticated,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const { linkId } = req.params;

      if (!user || !user._id) {
        res.status(401).json({ message: "User session invalid" });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        res.status(400).json({ message: "Invalid link ID format" });
        return;
      }

      // Find the calendar link and ensure it belongs to the user
      const calendarLink = await UserCalendarLink.findOne({
        _id: linkId,
        userId: user._id,
        isActive: true,
      });

      if (!calendarLink) {
        res.status(404).json({ message: "Active calendar link not found" });
        return;
      }

      // TODO: Implement actual sync logic in a separate service/job
      // For now, return a placeholder response
      res.json({
        message: "Manual sync functionality not yet implemented",
        linkId,
        provider: calendarLink.provider,
        status: "pending",
        note: "Sync functionality will be implemented in a future update",
      });
    } catch (error) {
      console.error("Error triggering manual sync:", error);
      res.status(500).json({
        message: "Failed to trigger manual sync",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
