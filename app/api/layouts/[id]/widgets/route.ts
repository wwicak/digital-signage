import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../../lib/mongodb";
import Layout from "../../../../../lib/models/Layout";
import Widget from "../../../../../lib/models/Widget";
import { requireAuth } from "../../../../../lib/auth";
import mongoose from "mongoose";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    // Get authenticated user
    const user = await requireAuth(request);
    console.log("[DEBUG] Authenticated user:", {
      id: user._id,
      email: user.email,
    });

    const { id: layoutId } = await params;
    console.log("[DEBUG] Layout ID from params:", layoutId);

    if (!layoutId || !mongoose.Types.ObjectId.isValid(layoutId)) {
      console.log("[DEBUG] Invalid layout ID:", layoutId);
      return NextResponse.json({ error: "Invalid layout ID" }, { status: 400 });
    }

    // First, check if layout exists at all
    const layoutExists = await Layout.findById(layoutId);
    console.log("[DEBUG] Layout exists:", !!layoutExists);
    if (layoutExists) {
      console.log("[DEBUG] Layout creator_id:", layoutExists.creator_id);
    }

    // For now, just find the layout without ownership check for debugging
    // TODO: Re-enable ownership check once authentication is working properly
    const layout = await Layout.findById(layoutId);

    console.log("[DEBUG] Layout found:", !!layout);

    if (!layout) {
      console.log("[DEBUG] Layout does not exist at all");
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    // Log ownership info for debugging
    console.log(
      "[DEBUG] Layout creator_id:",
      layout.creator_id,
      "User _id:",
      user._id
    );
    console.log(
      "[DEBUG] Types - Layout creator_id:",
      typeof layout.creator_id,
      "User _id:",
      typeof user._id
    );
    console.log(
      "[DEBUG] Equal?",
      layout.creator_id.toString() === user._id.toString()
    );

    // For now, allow any user to add widgets to any layout for debugging
    // TODO: Re-enable ownership check once authentication is working properly

    // Parse request body
    const body = await request.json();
    const { type, name, x, y, w, h, data } = body;

    // Create the widget with the authenticated user's ID
    const widget = new Widget({
      type,
      name: name || `${type} Widget`,
      data: data || {},
      creator_id: new mongoose.Types.ObjectId(user._id), // Convert string to ObjectId
    });

    console.log("[DEBUG] Creating widget with creator_id:", user._id);

    await widget.save();

    // Add widget reference to layout
    layout.widgets.push({
      widget_id: widget._id as mongoose.Types.ObjectId,
      x: x || 0,
      y: y || 0,
      w: w || 2,
      h: h || 2,
    });

    layout.last_update = new Date();
    await layout.save();

    // Populate the widget for response
    await layout.populate("widgets.widget_id");

    return NextResponse.json(
      {
        message: "Widget added to layout successfully",
        widget: {
          _id: widget._id,
          type: widget.type,
          name: widget.name,
          data: widget.data,
          x,
          y,
          w,
          h,
        },
        layout,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Add widget to layout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id: layoutId } = await params;
    if (!layoutId || !mongoose.Types.ObjectId.isValid(layoutId)) {
      return NextResponse.json({ error: "Invalid layout ID" }, { status: 400 });
    }

    // Find the layout
    const layout = await Layout.findById(layoutId);
    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    // Parse request body - expecting array of widget positions
    const positions = await request.json();

    // Type for widget position updates
    interface WidgetPosition {
      widget_id: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }

    // Update widget positions in layout
    (positions as WidgetPosition[]).forEach((pos) => {
      const widgetIndex = layout.widgets.findIndex(
        (w) => w.widget_id.toString() === pos.widget_id
      );
      if (widgetIndex !== -1) {
        layout.widgets[widgetIndex].x = pos.x;
        layout.widgets[widgetIndex].y = pos.y;
        layout.widgets[widgetIndex].w = pos.w;
        layout.widgets[widgetIndex].h = pos.h;
      }
    });

    layout.last_update = new Date();
    await layout.save();

    return NextResponse.json({
      message: "Widget positions updated successfully",
      layout,
    });
  } catch (error: unknown) {
    console.error("Update widget positions error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id: layoutId } = await params;
    if (!layoutId || !mongoose.Types.ObjectId.isValid(layoutId)) {
      return NextResponse.json({ error: "Invalid layout ID" }, { status: 400 });
    }

    // Get widget_id from query params
    const { searchParams } = new URL(request.url);
    const widgetId = searchParams.get("widget_id");

    if (!widgetId || !mongoose.Types.ObjectId.isValid(widgetId)) {
      return NextResponse.json({ error: "Invalid widget ID" }, { status: 400 });
    }

    // Find the layout
    const layout = await Layout.findById(layoutId);
    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    // Remove widget from layout
    layout.widgets = layout.widgets.filter(
      (w) => w.widget_id.toString() !== widgetId
    );

    layout.last_update = new Date();
    await layout.save();

    // Optionally delete the widget itself if it's not used elsewhere
    // For now, we'll keep the widget in case it's used in other layouts

    return NextResponse.json({
      message: "Widget removed from layout successfully",
    });
  } catch (error: unknown) {
    console.error("Remove widget from layout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}
