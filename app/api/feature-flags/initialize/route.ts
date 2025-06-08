import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { initializeDefaultFeatureFlags } from "@/lib/helpers/feature_flag_helper";
import { UserRoleName } from "@/lib/models/User";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Only super admins can initialize feature flags
    if (user.role.name !== UserRoleName.SUPER_ADMIN) {
      return NextResponse.json(
        { message: "Access denied: Only super admins can initialize feature flags" },
        { status: 403 }
      );
    }

    // Initialize default feature flags
    await initializeDefaultFeatureFlags(user._id.toString());

    return NextResponse.json({
      message: "Feature flags initialized successfully",
      initializedBy: user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error initializing feature flags:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Failed to initialize feature flags", error: error.message },
      { status: 500 }
    );
  }
}
