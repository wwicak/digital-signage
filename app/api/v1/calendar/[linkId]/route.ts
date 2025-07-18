import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UserCalendarLink from "@/lib/models/UserCalendarLink";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/helpers/rbac_helper";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";
import { decrypt } from "@/lib/utils/encryption";
import { GoogleCalendarService } from "@/lib/services/google_calendar_service";
// import { OutlookCalendarService } from "@/lib/services/outlook_calendar_service"; // Assuming Outlook service exists

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ linkId: string }> }) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "delete", resource: "calendar" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot delete calendar link" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { linkId } = resolvedParams;

    const calendarLink = await UserCalendarLink.findById(linkId);

    if (!calendarLink) {
      return NextResponse.json(
        { message: "Calendar link not found" },
        { status: 404 }
      );
    }

    // Ensure the user owns the calendar link or has admin permissions
    if (calendarLink.userId.toString() !== user._id.toString() && !user.isAdmin) {
        return NextResponse.json(
            { message: "Access denied: You do not own this calendar link" },
            { status: 403 }
        );
    }

    // Attempt to revoke token with the external provider
    try {
      const accessToken = decrypt(calendarLink.accessToken);
      if (calendarLink.provider === "google") {
        const googleService = new GoogleCalendarService(calendarLink);
        await googleService.revokeAuth(accessToken);
      } else if (calendarLink.provider === "outlook") {
        // const outlookService = new OutlookCalendarService(calendarLink);
        // await outlookService.revokeAuth(accessToken);
        console.log("Outlook token revocation not yet implemented.");
      }
    } catch (tokenRevocationError) {
      console.error("Error revoking token with external provider:", tokenRevocationError);
      // Continue with deletion even if token revocation fails
    }

    await UserCalendarLink.findByIdAndDelete(linkId);

    return NextResponse.json({
      message: "Calendar link removed successfully",
      linkId,
    });
  } catch (error: unknown) {
    console.error("Error deleting calendar link:", error);
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}
