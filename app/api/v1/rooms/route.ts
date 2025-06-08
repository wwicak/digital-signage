import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Room, { RoomSchemaZod } from "@/lib/models/Room";
import Building from "@/lib/models/Building";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { hasPermission } from "@/lib/helpers/rbac_helper";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "read", resource: "room" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view rooms" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const buildingId = searchParams.get("building_id");
    const skip = (page - 1) * limit;

    let query: any = {};
    if (buildingId && mongoose.Types.ObjectId.isValid(buildingId)) {
      query.building_id = buildingId;
    }

    const rooms = await Room.find(query)
      .populate("building_id", "name address")
      .skip(skip)
      .limit(limit)
      .sort({ creation_date: -1 });

    const total = await Room.countDocuments(query);

    return NextResponse.json({
      rooms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching rooms" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "create", resource: "room" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot create rooms" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = RoomSchemaZod.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, building_id, capacity, facilities } = validation.data;

    const building = await Building.findById(building_id);
    if (!building) {
      return NextResponse.json(
        { message: "Building not found" },
        { status: 404 }
      );
    }

    const existingRoom = await Room.findOne({ name, building_id });
    if (existingRoom) {
      return NextResponse.json(
        { message: "Room with this name already exists in the building" },
        { status: 409 }
      );
    }

    const room = new Room({
      name,
      building_id,
      capacity,
      facilities: facilities || [],
    });

    await room.save();
    await room.populate("building_id", "name address");

    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { message: error.message || "Error creating room" },
      { status: error.status || 500 }
    );
  }
}
