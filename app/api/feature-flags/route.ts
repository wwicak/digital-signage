import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/helpers/auth_helper";
import FeatureFlag, { 
  IFeatureFlag, 
  FeatureFlagSchemaZod,
  FeatureFlagName,
  FeatureFlagType 
} from "@/lib/models/FeatureFlag";
import { canManageFeatureFlags, canReadFeatureFlags } from "@/lib/helpers/rbac_helper";
import { clearFeatureFlagCache } from "@/lib/helpers/feature_flag_helper";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const type = url.searchParams.get("type") as FeatureFlagType | null;
    const enabled = url.searchParams.get("enabled");

    // Build query
    const query: any = {};
    if (type) {
      query.type = type;
    }
    if (enabled !== null) {
      query.enabled = enabled === "true";
    }

    const featureFlags = await FeatureFlag.find(query).sort({ type: 1, name: 1 });

    return NextResponse.json(featureFlags);
  } catch (error: any) {
    console.error("Error fetching feature flags:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Failed to fetch feature flags", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Check if user can manage feature flags
    const canManage = await canManageFeatureFlags(user);
    if (!canManage) {
      return NextResponse.json(
        { message: "Access denied: Cannot create feature flags" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate the request body
    const parseResult = FeatureFlagSchemaZod.safeParse({
      ...body,
      createdBy: user._id,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { name, displayName, description, type, enabled, allowedRoles } = parseResult.data;

    // Check if feature flag already exists
    const existingFlag = await FeatureFlag.findOne({ name });
    if (existingFlag) {
      return NextResponse.json(
        { message: "Feature flag with this name already exists" },
        { status: 409 }
      );
    }

    // Create new feature flag
    const newFeatureFlag = new FeatureFlag({
      name,
      displayName,
      description,
      type,
      enabled,
      allowedRoles,
      createdBy: user._id,
    });

    const savedFeatureFlag = await newFeatureFlag.save();

    // Clear cache to ensure new flag is available immediately
    clearFeatureFlagCache();

    return NextResponse.json(savedFeatureFlag, { status: 201 });
  } catch (error: any) {
    console.error("Error creating feature flag:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Failed to create feature flag", error: error.message },
      { status: 500 }
    );
  }
}
