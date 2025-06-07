import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User, { UserRoleName, IUserRole } from "@/lib/models/User";
import Building from "@/lib/models/Building";
import Display from "@/lib/models/Display";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { hasPermission } from "@/lib/helpers/rbac_helper";
import { sanitizeUser } from "@/lib/helpers/auth_helper";
import { z } from "zod";
import mongoose from "mongoose";

// Request schema for updating user role
const UpdateUserRoleSchema = z.object({
  role: z
    .object({
      name: z.nativeEnum(UserRoleName),
      associatedBuildingIds: z.array(z.string()).optional(),
      associatedDisplayIds: z.array(z.string()).optional(),
    })
    .optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can view users
    if (!hasPermission(user, { action: "read", resource: "user" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view user details" },
        { status: 403 }
      );
    }

    const targetUser = await User.findById(params.id)
      .populate("role.associatedBuildingIds", "name")
      .populate("role.associatedDisplayIds", "name")
      .select("-salt -hash");

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: sanitizeUser(targetUser),
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching user" },
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

    // Check if user can update users
    if (!hasPermission(user, { action: "update", resource: "user" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot update users" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateUserRoleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { role, name, email } = validation.data;

    // Find the target user
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Prevent users from modifying their own role unless they're SuperAdmin
    if (
      user._id.toString() === params.id &&
      user.role.name !== UserRoleName.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { message: "Access denied: Cannot modify your own role" },
        { status: 403 }
      );
    }

    // Update basic info if provided
    if (name) targetUser.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email,
        _id: { $ne: params.id },
      });
      if (existingUser) {
        return NextResponse.json(
          { message: "Email already taken" },
          { status: 409 }
        );
      }
      targetUser.email = email;
    }

    // Update role if provided
    if (role) {
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
            { message: "Access denied: Cannot assign SuperAdmin role" },
            { status: 403 }
          );
        }

        // Cannot modify SuperAdmin users
        if (targetUser.role.name === UserRoleName.SUPER_ADMIN) {
          return NextResponse.json(
            { message: "Access denied: Cannot modify SuperAdmin users" },
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

          if (
            role.associatedDisplayIds &&
            role.associatedDisplayIds.length > 0
          ) {
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

      // Convert string IDs to ObjectIds and update role
      const roleWithObjectIds: IUserRole = {
        name: role.name,
        associatedBuildingIds: role.associatedBuildingIds?.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
        associatedDisplayIds: role.associatedDisplayIds?.map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
      };

      targetUser.role = roleWithObjectIds;
    }

    await targetUser.save();

    // Populate the role references for response
    await targetUser.populate("role.associatedBuildingIds", "name");
    await targetUser.populate("role.associatedDisplayIds", "name");

    return NextResponse.json({
      message: "User updated successfully",
      user: sanitizeUser(targetUser),
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      {
        message: "Error updating user",
        error: error.message,
      },
      { status: 500 }
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

    // Check if user can delete users
    if (!hasPermission(user, { action: "delete", resource: "user" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot delete users" },
        { status: 403 }
      );
    }

    // Find the target user
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Prevent users from deleting themselves
    if (user._id.toString() === params.id) {
      return NextResponse.json(
        { message: "Access denied: Cannot delete yourself" },
        { status: 403 }
      );
    }

    // Prevent non-SuperAdmin from deleting SuperAdmin users
    if (
      user.role.name !== UserRoleName.SUPER_ADMIN &&
      targetUser.role.name === UserRoleName.SUPER_ADMIN
    ) {
      return NextResponse.json(
        { message: "Access denied: Cannot delete SuperAdmin users" },
        { status: 403 }
      );
    }

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      {
        message: "Error deleting user",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
