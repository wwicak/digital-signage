import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "@/lib/models/Display";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { z } from "zod";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Request body schema
const ChangeLayoutRequestSchema = z.object({
  layoutId: z.string().min(1, "Layout ID is required"),
  immediate: z.boolean().optional().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    // Require authentication
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: displayId } = await params;
    if (!displayId) {
      return NextResponse.json(
        { error: "Display ID is required" },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ChangeLayoutRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { layoutId, immediate } = validation.data;

    // Check if display exists
    const display = await Display.findById(displayId);
    if (!display) {
      return NextResponse.json({ error: "Display not found" }, { status: 404 });
    }

    // Update display layout
    const updatedDisplay = await Display.findByIdAndUpdate(
      displayId,
      {
        layout: layoutId,
        updated_at: new Date(),
        // Add a flag to indicate layout change is pending
        layoutChangeRequested: true,
        layoutChangeTimestamp: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedDisplay) {
      return NextResponse.json(
        { error: "Failed to update display layout" },
        { status: 500 }
      );
    }

    // If immediate change is requested, we'll send a server-sent event
    // to notify the display to reload with the new layout
    if (immediate) {
      // In a real implementation, you would send an SSE event here
      // For now, we'll just log it and rely on the display's periodic refresh
      console.log(
        `Layout change requested for display ${displayId} to layout ${layoutId}`
      );

      // You could implement SSE broadcasting here:
      // await broadcastLayoutChange(displayId, layoutId);
    }

    return NextResponse.json({
      success: true,
      message: "Layout change requested successfully",
      display: {
        id: updatedDisplay._id,
        name: updatedDisplay.name,
        newLayout: layoutId,
        changeRequested: true,
        changeTimestamp: updatedDisplay.layoutChangeTimestamp,
      },
    });
  } catch (error: any) {
    console.error("Change layout error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    // Require authentication
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: displayId } = await params;
    if (!displayId) {
      return NextResponse.json(
        { error: "Display ID is required" },
        { status: 400 }
      );
    }

    // Get display with layout change status
    const display = await Display.findById(displayId).select({
      _id: 1,
      name: 1,
      layout: 1,
      layoutChangeRequested: 1,
      layoutChangeTimestamp: 1,
      last_update: 1,
    });

    if (!display) {
      return NextResponse.json({ error: "Display not found" }, { status: 404 });
    }

    // Check if display is online (heartbeat within last 2 minutes)
    const isOnline =
      display.last_update &&
      Date.now() - new Date(display.last_update).getTime() < 2 * 60 * 1000;

    return NextResponse.json({
      displayId: display._id,
      name: display.name,
      currentLayout: display.layout,
      isOnline,
      layoutChangeRequested: display.layoutChangeRequested || false,
      layoutChangeTimestamp: display.layoutChangeTimestamp,
      lastSeen: display.last_update,
    });
  } catch (error: any) {
    console.error("Get layout change status error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
