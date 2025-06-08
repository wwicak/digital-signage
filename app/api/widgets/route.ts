import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Widget from "@/lib/models/Widget";
import { validateWidgetData } from "@/lib/helpers/widget_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/helpers/auth_helper";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const display_id = searchParams.get("display_id");

    if (display_id) {
      // Get widgets for a specific display
      const Display = (await import("@/lib/models/Display")).default;
      const display = await Display.findById(display_id).populate("widgets");

      if (!display) {
        return NextResponse.json(
          { message: "Display not found" },
          { status: 404 }
        );
      }

      // Filter widgets to only include those owned by the current user
      const userWidgets = display.widgets.filter(
        (widget: any) =>
          widget.creator_id && widget.creator_id.toString() === user._id
      );

      return NextResponse.json(userWidgets);
    } else {
      // Get all widgets for the logged-in user
      const widgets = await Widget.find({ creator_id: user._id });
      return NextResponse.json(widgets);
    }
  } catch (error: any) {
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error fetching widgets.", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();

    const { name, type, x, y, w, h, data, display_id } = body;

    if (!name || !type) {
      return NextResponse.json(
        { message: "Widget name and type are required." },
        { status: 400 }
      );
    }

    if (!display_id) {
      return NextResponse.json(
        { message: "Display ID is required." },
        { status: 400 }
      );
    }

    await validateWidgetData(type, data);

    const newWidgetDoc = new Widget({
      name,
      type,
      x: x === undefined ? 0 : x,
      y: y === undefined ? 0 : y,
      w: w === undefined ? 1 : w,
      h: h === undefined ? 1 : h,
      data,
      creator_id: user._id,
    });

    const savedWidget = await newWidgetDoc.save();

    // If display_id is provided, add widget to display's widgets array
    if (display_id) {
      const Display = (await import("@/lib/models/Display")).default;

      // First check if display exists at all
      const displayExists = await Display.findById(display_id);

      // Try to find and update display with creator check
      let updatedDisplay = await Display.findOneAndUpdate(
        { _id: display_id, creator_id: user._id }, // Ensure user owns the display
        { $addToSet: { widgets: savedWidget._id } },
        { new: true }
      );

      // If not found with creator_id, try without creator_id check (for legacy displays)
      if (!updatedDisplay && displayExists) {
        updatedDisplay = await Display.findOneAndUpdate(
          { _id: display_id }, // No creator check for legacy displays
          { $addToSet: { widgets: savedWidget._id } },
          { new: true }
        );
      }

      if (!updatedDisplay) {
        // If display not found or not owned by user, delete the widget and return error
        await savedWidget.deleteOne();
        return NextResponse.json(
          { message: "Display not found or not authorized" },
          { status: 404 }
        );
      }

      // Send SSE event for display update
      try {
        sendEventToDisplay(display_id, "display_updated", {
          displayId: display_id,
          action: "update",
          reason: "widget_added",
          widgetId: (savedWidget._id as any).toString(),
        });
      } catch (sseError) {
        console.error("SSE notification failed:", sseError);
      }
    }

    return NextResponse.json(savedWidget, { status: 201 });
  } catch (error: any) {
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { message: "Validation Error", errors: error.errors },
        { status: 400 }
      );
    }
    if (
      error.message.startsWith("Invalid data for") ||
      error.message.includes("not found")
    ) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Error creating widget", error: error.message },
      { status: 500 }
    );
  }
}
