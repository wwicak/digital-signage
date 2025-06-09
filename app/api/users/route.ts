import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User, { UserRoleName, IUserRole } from "@/lib/models/User";
import Building from "@/lib/models/Building";
import Display from "@/lib/models/Display";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { hasPermission, canCreateUsers } from "@/lib/helpers/rbac_helper";
import { registerUser, sanitizeUser } from "@/lib/helpers/auth_helper";
import { z } from "zod";
import mongoose from "mongoose";

// Request schema for creating a user
const CreateUserRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.object({
    name: z.nativeEnum(UserRoleName),
    associatedBuildingIds: z.array(z.string()).optional(),
    associatedDisplayIds: z.array(z.string()).optional(),
  }),
});

// Request schema for updating user role
const _UpdateUserRoleSchema = z.object({
  role: z.object({
    name: z.nativeEnum(UserRoleName),
    associatedBuildingIds: z.array(z.string()).optional(),
    associatedDisplayIds: z.array(z.string()).optional(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can view users (SuperAdmin or ResourceManager)
    if (!hasPermission(user, { action: "read", resource: "user" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view users" },
        { status: 403 }
      );
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Get users with populated role references
    const users = await User.find({})
      .populate("role.associatedBuildingIds", "name")
      .populate("role.associatedDisplayIds", "name")
      .select("-salt -hash") // Exclude password fields
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalUsers = await User.countDocuments({});

    return NextResponse.json({
      users: users.map(sanitizeUser),
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching users" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can create users
    if (!canCreateUsers(user)) {
      return NextResponse.json(
        { message: "Access denied: Cannot create users" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = CreateUserRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password, name, role } = validation.data;

    // Check if user already exists
    const existingUser = await User.findByUsername(email);
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    // Validate that associated building and display IDs exist
    if (role.associatedBuildingIds && role.associatedBuildingIds.length > 0) {
      const buildings = await Building.find({
        _id: {
          $in: role.associatedBuildingIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      });
      if (buildings.length !== role.associatedBuildingIds.length) {
        return NextResponse.json(
          { message: "One or more building IDs are invalid" },
          { status: 400 }
        );
      }
    }

    if (role.associatedDisplayIds && role.associatedDisplayIds.length > 0) {
      const displays = await Display.find({
        _id: {
          $in: role.associatedDisplayIds.map(
            (id) => new mongoose.Types.ObjectId(id)
          ),
        },
      });
      if (displays.length !== role.associatedDisplayIds.length) {
        return NextResponse.json(
          { message: "One or more display IDs are invalid" },
          { status: 400 }
        );
      }
    }

    // Validate role assignment permissions
    if (user.role.name !== UserRoleName.SUPER_ADMIN) {
      // Non-SuperAdmin users cannot create SuperAdmin users
      if (role.name === UserRoleName.SUPER_ADMIN) {
        return NextResponse.json(
          { message: "Access denied: Cannot create SuperAdmin users" },
          { status: 403 }
        );
      }

      // ResourceManager can only assign roles for resources they manage
      if (user.role.name === UserRoleName.RESOURCE_MANAGER) {
        if (
          role.associatedBuildingIds &&
          role.associatedBuildingIds.length > 0
        ) {
          const userBuildingIds = (user.role.associatedBuildingIds || []).map(
            (id) => id.toString()
          );
          const hasAccess = role.associatedBuildingIds.every((id) =>
            userBuildingIds.includes(id)
          );
          if (!hasAccess) {
            return NextResponse.json(
              {
                message:
                  "Access denied: Cannot assign buildings you don't manage",
              },
              { status: 403 }
            );
          }
        }

        if (role.associatedDisplayIds && role.associatedDisplayIds.length > 0) {
          const userDisplayIds = (user.role.associatedDisplayIds || []).map(
            (id) => id.toString()
          );
          const hasAccess = role.associatedDisplayIds.every((id) =>
            userDisplayIds.includes(id)
          );
          if (!hasAccess) {
            return NextResponse.json(
              {
                message:
                  "Access denied: Cannot assign displays you don't manage",
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Convert string IDs to ObjectIds
    const roleWithObjectIds: IUserRole = {
      name: role.name,
      associatedBuildingIds: role.associatedBuildingIds?.map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
      associatedDisplayIds: role.associatedDisplayIds?.map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
    };

    // Create user with basic info first
    const registeredUser = await registerUser(email, password, name);

    // Update the user with the role information
    registeredUser.role = roleWithObjectIds;
    await registeredUser.save();

    // Populate the role references for response
    await registeredUser.populate("role.associatedBuildingIds", "name");
    await registeredUser.populate("role.associatedDisplayIds", "name");

    return NextResponse.json(
      {
        message: "User created successfully",
        user: sanitizeUser(registeredUser),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle specific passport-local-mongoose errors
    if (error.name === "UserExistsError") {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        message: "Error creating user",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
