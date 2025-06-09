import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { FeatureFlag } from "@/lib/models/FeatureFlag";
import { FeatureFlagName } from "@/lib/types/feature-flags";

interface CheckMultipleRequest {
  flagNames: FeatureFlagName[];
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);
    
    const body: CheckMultipleRequest = await request.json();
    const { flagNames } = body;

    if (!Array.isArray(flagNames) || flagNames.length === 0) {
      return NextResponse.json(
        { message: "flagNames must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate all flag names
    const invalidFlags = flagNames.filter(
      name => !Object.values(FeatureFlagName).includes(name)
    );

    if (invalidFlags.length > 0) {
      return NextResponse.json(
        { 
          message: `Invalid feature flag names: ${invalidFlags.join(", ")}`,
          access: {},
        },
        { status: 400 }
      );
    }

    // Find all requested feature flags
    const featureFlags = await FeatureFlag.find({
      name: { $in: flagNames },
    });

    // Build access map
    const access: Record<FeatureFlagName, boolean> = {};

    for (const flagName of flagNames) {
      const flag = featureFlags.find(f => f.name === flagName);
      
      if (!flag) {
        // Flag doesn't exist, deny access
        access[flagName] = false;
        continue;
      }

      if (!flag.enabled) {
        // Flag is disabled, deny access
        access[flagName] = false;
        continue;
      }

      // Check role access
      const hasRoleAccess = flag.allowedRoles.length === 0 || 
                           flag.allowedRoles.includes(user.role.name);
      
      access[flagName] = hasRoleAccess;
    }

    return NextResponse.json({
      access,
      userRole: user.role.name,
      total: flagNames.length,
      granted: Object.values(access).filter(Boolean).length,
    });

  } catch (error: any) {
    console.error("Error checking multiple feature flags:", error);
    return NextResponse.json(
      { 
        message: error.message || "Error checking multiple feature flags",
        access: {},
      },
      { status: error.status || 500 }
    );
  }
}
