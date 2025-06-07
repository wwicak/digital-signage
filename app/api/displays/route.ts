import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Display from "@/lib/models/Display";
import { WidgetType } from "@/lib/models/Widget";
import { createWidgetsForDisplay } from "@/lib/helpers/display_helper";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { hasPermission, addAccessFilter } from "@/lib/helpers/rbac_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import { z } from "zod";

// --- Zod schemas ---
const DisplayCreateSchema = z.object({
  name: z.string().min(1),
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
        name: z.string(),
        type: z.nativeEnum(WidgetType),
        x: z.number(),
        y: z.number(),
        w: z.number(),
        h: z.number(),
        data: z.any().default({}), // Required for WidgetData interface, default to empty object
      })
    )
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user has permission to read displays
    if (!hasPermission(user, { action: "read", resource: "display" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view displays" },
        { status: 403 }
      );
    }

    // Apply access filter based on user's role
    let query = {};
    query = addAccessFilter(user, "display", query);

    const displays = await Display.find(query).populate("widgets");
    return NextResponse.json(displays);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error fetching displays" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user has permission to create displays
    if (!hasPermission(user, { action: "create", resource: "display" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot create displays" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const parseResult = DisplayCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { name, description, layout, orientation, statusBar, widgets } =
      parseResult.data;

    const newDisplayDoc = new Display({
      name,
      description,
      creator_id: user._id,
      layout,
      orientation,
      statusBar,
      widgets: [],
    });

    if (widgets && widgets.length > 0) {
      // Ensure widgets have required data property for WidgetData interface
      const widgetsWithData = widgets.map((w) => ({
        ...w,
        data: w.data || {},
      }));
      await createWidgetsForDisplay(newDisplayDoc, widgetsWithData, user._id);
    }

    const savedDisplay = await newDisplayDoc.save();
    const populatedDisplay = await savedDisplay.populate("widgets");

    // Send SSE event for display creation
    try {
      sendEventToDisplay("global", "display-updated", {
        displayId: savedDisplay._id,
        action: "create",
        display: populatedDisplay,
      });
    } catch (error) {
      console.error("Failed to send SSE event:", error);
    }

    return NextResponse.json(populatedDisplay, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error creating display" },
      { status: error.status || 500 }
    );
  }
}
