import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/helpers/auth_helper";
import FeatureFlag, { FeatureFlagSchemaZod } from "@/lib/models/FeatureFlag";
import { canManageFeatureFlags, canReadFeatureFlags } from "@/lib/helpers/rbac_helper";
import { clearFeatureFlagCache } from "@/lib/helpers/feature_flag_helper";
import mongoose from "mongoose";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can read feature flags
    const canRead = await canReadFeatureFlags(user);
    if (!canRead) {
      return NextResponse.json(
        { message: "Access denied: Cannot read feature flags" },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid feature flag ID" },
        { status: 400 }
      );
    }

    const featureFlag = await FeatureFlag.findById(id);

    if (!featureFlag) {
      return NextResponse.json(
        { message: "Feature flag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(featureFlag);
  } catch (error: any) {
    console.error("Error fetching feature flag:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Failed to fetch feature flag", error: error.message },
      { status: 500 }
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

    // Check if user can manage feature flags
    const canManage = await canManageFeatureFlags(user);
    if (!canManage) {
      return NextResponse.json(
        { message: "Access denied: Cannot update feature flags" },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid feature flag ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Find the existing feature flag
    const existingFlag = await FeatureFlag.findById(id);
    if (!existingFlag) {
      return NextResponse.json(
        { message: "Feature flag not found" },
        { status: 404 }
      );
    }

    // Validate the request body (partial update)
    const updateData = {
      ...body,
      name: existingFlag.name, // Don't allow name changes
    };

    const parseResult = FeatureFlagSchemaZod.partial().safeParse(updateData);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Update the feature flag
    const updatedFlag = await FeatureFlag.findByIdAndUpdate(
      id,
      {
        $set: {
          displayName: parseResult.data.displayName,
          description: parseResult.data.description,
          enabled: parseResult.data.enabled,
          allowedRoles: parseResult.data.allowedRoles,
        },
      },
      { new: true, runValidators: true }
    );

    // Clear cache to ensure changes are reflected immediately
    clearFeatureFlagCache();

    return NextResponse.json(updatedFlag);
  } catch (error: any) {
    console.error("Error updating feature flag:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Failed to update feature flag", error: error.message },
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

    // Check if user can manage feature flags
    const canManage = await canManageFeatureFlags(user);
    if (!canManage) {
      return NextResponse.json(
        { message: "Access denied: Cannot delete feature flags" },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid feature flag ID" },
        { status: 400 }
      );
    }

    const deletedFlag = await FeatureFlag.findByIdAndDelete(id);

    if (!deletedFlag) {
      return NextResponse.json(
        { message: "Feature flag not found" },
        { status: 404 }
      );
    }

    // Clear cache to ensure deletion is reflected immediately
    clearFeatureFlagCache();

    return NextResponse.json({ 
      message: "Feature flag deleted successfully",
      deletedFlag 
    });
  } catch (error: any) {
    console.error("Error deleting feature flag:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Failed to delete feature flag", error: error.message },
      { status: 500 }
    );
  }
}
