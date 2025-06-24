import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import Layout from "../../../lib/models/Layout";
import Widget from "../../../lib/models/Widget"; // Import Widget model to ensure it's registered
import { requireAuth } from "../../../lib/auth";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // For now, return empty layouts array since we don't have auth working
    // In production, you'd want proper authentication

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    const orientation = searchParams.get("orientation");
    const isActive = searchParams.get("isActive");
    const isTemplate = searchParams.get("isTemplate");

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (orientation) {
      query.orientation = orientation;
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (isTemplate !== null && isTemplate !== undefined) {
      query.isTemplate = isTemplate === "true";
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination and populate widgets
    const [layouts, total] = await Promise.all([
      Layout.find(query)
        .populate("widgets.widget_id")
        .sort({ creation_date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Layout.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      layouts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error: any) {
    console.error("Get layouts error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user
    const user = await requireAuth(request);
    console.log("[DEBUG] Creating layout with user:", {
      id: user._id,
      email: user.email,
    });

    // Parse and validate request body
    const body = await request.json();

    // Create layout with authenticated user's ID
    const layoutData = {
      name: body.name || "Untitled Layout",
      description: body.description || "",
      orientation: body.orientation || "landscape",
      layoutType: body.layoutType || "spaced",
      widgets: body.widgets || [],
      statusBar: body.statusBar || {
        enabled: true,
        elements: [],
      },
      isActive: body.isActive !== undefined ? body.isActive : true,
      isTemplate: body.isTemplate !== undefined ? body.isTemplate : true,
      creator_id: new (require("mongoose").Types.ObjectId)(user._id), // Convert string to ObjectId
      gridConfig: body.gridConfig || {
        cols: 16,
        rows: 9,
        margin: [12, 12],
        rowHeight: 60,
      },
    };

    console.log("[DEBUG] Layout data creator_id:", layoutData.creator_id);

    // Create the layout
    const layout = new Layout(layoutData);
    await layout.save();

    console.log("[DEBUG] Layout created successfully:", {
      id: layout._id,
      creator_id: layout.creator_id,
    });

    // Populate widgets for response
    await layout.populate("widgets.widget_id");

    return NextResponse.json(
      {
        message: "Layout created successfully",
        layout,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create layout error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
