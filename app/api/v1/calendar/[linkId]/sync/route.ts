import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UserCalendarLink from "@/lib/models/UserCalendarLink";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/helpers/rbac_helper";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";
import { GoogleCalendarService } from "@/lib/services/google_calendar_service";

export async function POST(request: NextRequest, context: { params: Promise<{ linkId: string }> }) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "update", resource: "calendar" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot trigger calendar sync" },
        { status: 403 }
      );
    }

    const params = await context.params;
    const linkId = params.linkId;
    const calendarLink = await UserCalendarLink.findById(linkId);

    if (!calendarLink || !calendarLink.isActive) {
      return NextResponse.json(
        { message: "Active calendar link not found" },
        { status: 404 }
      );
    }

    if (calendarLink.provider !== 'google') {
        return NextResponse.json(
            { message: 'Sync is only implemented for Google Calendar at this time.' },
            { status: 400 }
        );
    }

    const googleService = new GoogleCalendarService(calendarLink);
    const { syncedCount } = await googleService.syncReservations();

    return NextResponse.json({
      message: `Successfully synced ${syncedCount} events.`,
      syncedCount,
    });
  } catch (error: unknown) {
    console.error("Error triggering calendar sync:", error);
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}
