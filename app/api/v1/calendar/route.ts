import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UserCalendarLink from "@/lib/models/UserCalendarLink";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/helpers/rbac_helper";

// Force dynamic rendering to prevent static generation errors
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "read", resource: "calendar" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view calendar connections" },
        { status: 403 }
      );
    }

    const calendarLinks = await UserCalendarLink.find({ userId: user._id })
      .select("-accessToken -refreshToken") // Don't expose tokens
      .sort({ createdAt: -1 });

    return NextResponse.json({
      calendarLinks,
      total: calendarLinks.length,
    });
  } catch (error: any) {
    console.error("Error fetching calendar links:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching calendar connections" },
      { status: error.status || 500 }
    );
  }
}
