import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Widget from "@/lib/models/Widget";
import Display, { IDisplay } from "@/lib/models/Display";
import { validateWidgetData } from "@/lib/helpers/widget_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { requireAuth } from "@/lib/helpers/auth_helper";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await context.params;

    // First try to find widget by creator_id
    let widget = await Widget.findOne({
      _id: id,
      creator_id: user._id,
    });

    // If not found, check if user has access through layouts
    if (!widget) {
      // Import Layout model
      const Layout = (await import("@/lib/models/Layout")).default;

      // Check if widget exists in any layout owned by the user
      const layoutWithWidget = await Layout.findOne({
        "widgets.widget_id": id,
        creator_id: user._id,
      });

      if (layoutWithWidget) {
        // User has access to this widget through their layout
        widget = await Widget.findById(id);
      }
    }

    if (!widget) {
      return NextResponse.json(
        { message: "Widget not found or not authorized." },
        { status: 404 }
      );
    }

    return NextResponse.json(widget);
  } catch (error: any) {
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error fetching widget.", error: error.message },
      { status: 500 }
    );
  }
}
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const body = await request.json();
    const { id } = await context.params;

    const { type, data, ...widgetUpdateData } = body;

    // First try to find widget by creator_id
    let widgetToUpdate = await Widget.findOne({
      _id: id,
      creator_id: user._id,
    });

    // If not found, check if user has access through layouts
    if (!widgetToUpdate) {
      // Import Layout model
      const Layout = (await import("@/lib/models/Layout")).default;

      // Check if widget exists in any layout owned by the user
      const layoutWithWidget = await Layout.findOne({
        "widgets.widget_id": id,
        creator_id: user._id,
      });

      if (layoutWithWidget) {
        // User has access to this widget through their layout
        widgetToUpdate = await Widget.findById(id);
      }
    }

    if (!widgetToUpdate) {
      return NextResponse.json(
        { message: "Widget not found or not authorized" },
        { status: 404 }
      );
    }

    const typeToValidate = type || widgetToUpdate.type;
    const dataToValidate = data === undefined ? widgetToUpdate.data : data;

    if (type || data !== undefined) {
      await validateWidgetData(typeToValidate, dataToValidate);
    }

    Object.assign(widgetToUpdate, widgetUpdateData);
    if (type) widgetToUpdate.type = type;
    if (data !== undefined) widgetToUpdate.data = dataToValidate;

    const savedWidget = await widgetToUpdate.save();

    // Notify relevant displays via SSE
    try {
      const displays = (await Display.find({
        widgets: savedWidget._id,
        creator_id: user._id, // Ensure user owns the display
      })) as IDisplay[];

      for (const display of displays) {
        sendEventToDisplay((display._id as any).toString(), "display_updated", {
          displayId: (display._id as any).toString(),
          action: "update",
          reason: "widget_change",
          widgetId: (savedWidget._id as any).toString(),
        });
      }
    } catch (notifyError) {
      console.error("SSE notification failed:", notifyError);
    }

    return NextResponse.json(savedWidget);
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
      { message: "Error updating widget", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    const { id } = await context.params;

    const widget = await Widget.findOne({
      _id: id,
      creator_id: user._id,
    });

    if (!widget) {
      return NextResponse.json(
        { message: "Widget not found or not authorized" },
        { status: 404 }
      );
    }

    // Remove widget from all displays that reference it
    await Display.updateMany({ widgets: id }, { $pull: { widgets: id } });

    // Delete the widget
    const deletedWidget = await Widget.findByIdAndDelete(id);

    if (!deletedWidget) {
      return NextResponse.json(
        { message: "Widget not found during deletion process." },
        { status: 404 }
      );
    }

    // Notify relevant displays via SSE
    try {
      const displays = (await Display.find({
        widgets: id,
        creator_id: user._id, // Ensure user owns the display
      })) as IDisplay[];

      for (const display of displays) {
        sendEventToDisplay((display._id as any).toString(), "display_updated", {
          displayId: (display._id as any).toString(),
          action: "update",
          reason: "widget_deleted",
          widgetId: id,
        });
      }
    } catch (notifyError) {
      console.error("SSE notification failed:", notifyError);
    }

    return NextResponse.json({
      message: "Widget deleted successfully and removed from displays",
    });
  } catch (error: any) {
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { message: "Error deleting widget", error: error.message },
      { status: 500 }
    );
  }
}
