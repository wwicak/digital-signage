import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "@/lib/models/Display";
import { WidgetType } from "@/lib/models/Widget";
import {
  updateWidgetsForDisplay,
  deleteWidgetsForDisplay,
} from "@/lib/helpers/display_helper";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { canAccessDisplay, canManageDisplay } from "@/lib/helpers/rbac_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { z } from "zod";

// --- Zod schemas ---
const DisplayUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  layout: z.string().optional(),
  orientation: z.string().optional(),
  statusBar: z
    .object({
      enabled: z.boolean().optional(),
      color: z.string().optional(),
      elements: z.array(z.string()).optional(),
    })
    .optional(),
  widgets: z
    .array(
      z.object({
        _id: z.string().optional(),
        name: z.string().optional(),
        type: z.nativeEnum(WidgetType).optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        w: z.number().optional(),
        h: z.number().optional(),
        data: z.any().optional(),
      })
    )
    .optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can access this display
    if (!canAccessDisplay(user, params.id)) {
      return NextResponse.json(
        { message: "Access denied: Cannot view this display" },
        { status: 403 }
      );
    }

    const display = await Display.findById(params.id).populate("widgets");

    if (!display) {
      return NextResponse.json(
        { message: "Display not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(display);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error fetching display" },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can manage this display
    if (!canManageDisplay(user, params.id)) {
      return NextResponse.json(
        { message: "Access denied: Cannot modify this display" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const parseResult = DisplayUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { widgets: newWidgetsData, ...displayData } = parseResult.data;
    const displayToUpdate = await Display.findById(params.id);

    if (!displayToUpdate) {
      return NextResponse.json(
        { message: "Display not found" },
        { status: 404 }
      );
    }

    Object.assign(displayToUpdate, displayData);

    if (newWidgetsData) {
      const updatedWidgetIds = await updateWidgetsForDisplay(
        displayToUpdate,
        newWidgetsData as any, // Type assertion for Partial<IWidget>[] compatibility
        user._id
      );
      displayToUpdate.widgets = updatedWidgetIds;
    }

    const savedDisplay = await displayToUpdate.save();
    const populatedDisplay = await savedDisplay.populate("widgets");

    // Send SSE event for display update
    try {
      sendEventToDisplay(params.id as string, "display_updated", {
        displayId: params.id,
        action: "update",
        display: populatedDisplay,
      });
      sendEventToDisplay("global", "display-updated", {
        displayId: params.id,
        action: "update",
        display: populatedDisplay,
      });
    } catch (error) {
      console.error("Failed to send SSE event:", error);
    }

    return NextResponse.json(populatedDisplay);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error updating display" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can manage this display (delete permission)
    if (!canManageDisplay(user, params.id)) {
      return NextResponse.json(
        { message: "Access denied: Cannot delete this display" },
        { status: 403 }
      );
    }

    const display = await Display.findById(params.id);

    if (!display) {
      return NextResponse.json(
        { message: "Display not found" },
        { status: 404 }
      );
    }

    await deleteWidgetsForDisplay(display);
    await Display.findByIdAndDelete(params.id);

    // Send SSE event for display deletion
    try {
      sendEventToDisplay(params.id as string, "display_updated", {
        displayId: params.id,
        action: "delete",
      });
      sendEventToDisplay("global", "display-updated", {
        displayId: params.id,
        action: "delete",
      });
    } catch (error) {
      console.error("Failed to send SSE event:", error);
    }

    return NextResponse.json({
      message: "Display and associated widgets deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error deleting display" },
      { status: error.status || 500 }
    );
  }
}
