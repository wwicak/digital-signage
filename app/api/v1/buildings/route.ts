import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Building, { BuildingSchemaZod } from "@/lib/models/Building";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/helpers/rbac_helper";

// Interface for HTTP-like errors
interface HttpError extends Error {
  status?: number;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "read", resource: "building" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view buildings" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const buildings = await Building.find({})
      .skip(skip)
      .limit(limit)
      .sort({ creation_date: -1 });

    const total = await Building.countDocuments({});

    return NextResponse.json({
      buildings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching buildings:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error fetching buildings" },
      { status: (error as HttpError)?.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "create", resource: "building" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot create buildings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = BuildingSchemaZod.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, address } = validation.data;

    const existingBuilding = await Building.findOne({ name });
    if (existingBuilding) {
      return NextResponse.json(
        { message: "Building with this name already exists" },
        { status: 409 }
      );
    }

    const building = new Building({ name, address });
    await building.save();

    return NextResponse.json(building, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating building:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error creating building" },
      { status: (error as HttpError)?.status || 500 }
    );
  }
}
