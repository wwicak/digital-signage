import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Room from "@/lib/models/Room";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/helpers/rbac_helper";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    // const user = await requireAuth(request);

    // if (!hasPermission(user, { action: "read", resource: "room" })) {
    //   return NextResponse.json(
    //     { message: "Access denied: Cannot view rooms" },
    //     { status: 403 }
    //   );
    // }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid room ID format" },
        { status: 400 }
      );
    }

    const room = await Room.findById(id).populate("building_id", "name address");

    if (!room) {
      return NextResponse.json(
        { message: "Room not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (error: unknown) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}