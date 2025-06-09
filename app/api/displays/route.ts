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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const layoutId = searchParams.get("layoutId");
    const includeOffline = searchParams.get("includeOffline") === "true";
    const withHeartbeat = searchParams.get("withHeartbeat") === "true";

    // Apply access filter based on user's role
    let query: any = {};
    query = addAccessFilter(user, "display", query);

    // Add layout filter if specified
    if (layoutId) {
      query.layout = layoutId;
    }

    // Filter by recent activity if not including offline displays
    if (!includeOffline) {
      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      query.last_update = { $gte: cutoffTime };
    }

    let displays;
    if (withHeartbeat) {
      // Include widgets when heartbeat data is requested
      displays = await Display.find(query)
        .populate("widgets")
        .select({
          _id: 1,
          name: 1,
          layout: 1,
          last_update: 1,
          location: 1,
          building: 1,
          created_at: 1,
          updated_at: 1,
          widgets: 1,
        })
        .sort({ last_update: -1 })
        .lean();
    } else {
      // Exclude widgets when not needed for better performance
      displays = await Display.find(query)
        .select({
          _id: 1,
          name: 1,
          layout: 1,
          last_update: 1,
          location: 1,
          building: 1,
          created_at: 1,
          updated_at: 1,
        })
        .sort({ last_update: -1 })
        .lean();
    }

    // Enhance displays with status information
    const enhancedDisplays = displays.map((display) => {
      const lastUpdate = display.last_update
        ? new Date(display.last_update)
        : null;
      const isOnline =
        lastUpdate && Date.now() - lastUpdate.getTime() < 2 * 60 * 1000; // 2 minutes

      return {
        ...display,
        name: display.name || `Display ${display._id.toString().slice(-4)}`,
        layout: display.layout || "default",
        lastSeen: lastUpdate,
        isOnline,
        location: display.location || "Unknown Location",
        building: display.building || "Main Building",
      };
    });

    // Group by layout if no specific layout requested
    let groupedByLayout: Record<string, any[]> = {};
    if (!layoutId) {
      enhancedDisplays.forEach((display) => {
        const layout = display.layout?.toString() || "default";
        if (!groupedByLayout[layout]) {
          groupedByLayout[layout] = [];
        }
        groupedByLayout[layout].push(display);
      });
    }

    return NextResponse.json({
      displays: enhancedDisplays,
      groupedByLayout: !layoutId ? groupedByLayout : undefined,
      filters: {
        layoutId,
        includeOffline,
        withHeartbeat,
      },
      meta: {
        total: enhancedDisplays.length,
        online: enhancedDisplays.filter((d) => d.isOnline).length,
        offline: enhancedDisplays.filter((d) => !d.isOnline).length,
      },
    });
  } catch (error: any) {
    console.error("Error in displays API:", error);

    // Provide more specific error messages
    let statusCode = 500;
    let message = "Error fetching displays";

    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongoTimeoutError"
    ) {
      message = "Database connection error. Please try again.";
      statusCode = 503;
    } else if (error.name === "ValidationError") {
      message = "Invalid request parameters.";
      statusCode = 400;
    } else if (error.message) {
      message = error.message;
    }

    return NextResponse.json(
      {
        message,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
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
