import { NextRequest, NextResponse } from "next/server";
import dbConnect from "../../../../lib/mongodb";
import Layout from "../../../../lib/models/Layout";
import Display from "../../../../lib/models/Display";
import mongoose from "mongoose";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid layout ID" }, { status: 400 });
    }

    // Find the layout with populated widgets
    const layout = await Layout.findById(id)
      .populate("widgets.widget_id")
      .lean();

    if (!layout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    // Get displays using this layout
    const displays = await Display.find({ layout: id })
      .select("_id name location building isOnline last_update")
      .lean();

    return NextResponse.json({
      layout: {
        ...layout,
        displays,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Get layout error:", error);
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

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid layout ID" }, { status: 400 });
    }

    // Find the layout first
    const existingLayout = await Layout.findById(id);
    if (!existingLayout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();

    // Update the layout
    const updatedLayout = await Layout.findByIdAndUpdate(
      id,
      { ...body, last_update: new Date() },
      { new: true, runValidators: true }
    ).populate("widgets.widget_id");

    if (!updatedLayout) {
      return NextResponse.json(
        { error: "Failed to update layout" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Layout updated successfully",
      layout: updatedLayout,
    });
  } catch (error: unknown) {
    console.error("Update layout error:", error);
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

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid layout ID" }, { status: 400 });
    }

    // Find the layout first
    const existingLayout = await Layout.findById(id);
    if (!existingLayout) {
      return NextResponse.json({ error: "Layout not found" }, { status: 404 });
    }

    // Check if layout is being used by any displays
    const displaysUsingLayout = await Display.countDocuments({ layout: id });
    if (displaysUsingLayout > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete layout",
          message: `This layout is currently being used by ${displaysUsingLayout} display(s). Please reassign those displays to a different layout first.`,
        },
        { status: 409 }
      );
    }

    // Delete the layout
    await Layout.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Layout deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Delete layout error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Internal server error", message: errorMessage },
      { status: 500 }
    );
  }
}
