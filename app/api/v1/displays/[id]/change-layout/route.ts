import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "@/lib/models/Display";
import { requireAuth } from "@/lib/auth";
import { sendEventToDisplay } from "@/lib/sse_display_manager";
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

    // If immediate change is requested, send a server-sent event
    // to notify the display to reload with the new layout
    if (immediate) {
      console.log(
        `Layout change requested for display ${displayId} to layout ${layoutId}`
      );

      // Send SSE event to the specific display
      try {
        const eventSent = sendEventToDisplay(
          displayId,
          "layout_change_requested",
          {
            displayId,
            newLayoutId: layoutId,
            timestamp: new Date().toISOString(),
            immediate: true,
          }
        );

        if (eventSent) {
          console.log(
            `SSE event sent to display ${displayId} for layout change`
          );
        } else {
          console.log(
            `No SSE connections for display ${displayId}, will rely on polling`
          );
        }
      } catch (error) {
        console.error(
          `Failed to send SSE event to display ${displayId}:`,
          error
        );
        // Don't fail the request if SSE fails - the display will pick it up via polling
      }
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

// PATCH method to clear the layout change flag (called by display after applying change)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id: displayId } = await params;
    if (!displayId) {
      return NextResponse.json(
        { error: "Display ID is required" },
        { status: 400 }
      );
    }

    // Clear the layout change flag
    const updatedDisplay = await Display.findByIdAndUpdate(
      displayId,
      {
        layoutChangeRequested: false,
        layoutChangeTimestamp: null,
        last_update: new Date(),
      },
      { new: true }
    );

    if (!updatedDisplay) {
      return NextResponse.json({ error: "Display not found" }, { status: 404 });
    }

    console.log(`Layout change flag cleared for display ${displayId}`);

    return NextResponse.json({
      success: true,
      message: "Layout change flag cleared",
      displayId: updatedDisplay._id,
    });
  } catch (error: any) {
    console.error("Clear layout change flag error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
