import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import { FeatureFlag } from "@/lib/models/FeatureFlag";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    // Find all enabled feature flags that the user has access to
    const featureFlags = await FeatureFlag.find({
      enabled: true,
      $or: [
        { allowedRoles: { $size: 0 } }, // No role restrictions
        { allowedRoles: user.role.name }, // User's role is allowed
      ],
    }).select("-createdBy -createdAt -updatedAt");

    return NextResponse.json({
      featureFlags,
      total: featureFlags.length,
      userRole: user.role.name,
    });

  } catch (error: any) {
    console.error("Error fetching accessible feature flags:", error);
    return NextResponse.json(
      { 
        message: error.message || "Error fetching accessible feature flags",
        featureFlags: [],
        total: 0,
      },
      { status: error.status || 500 }
    );
  }
}
