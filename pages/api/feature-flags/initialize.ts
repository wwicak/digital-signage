import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { initializeDefaultFeatureFlags } from "@/lib/helpers/feature_flag_helper";
import { UserRoleName } from "@/lib/models/User";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();
    const user = await requireAuth(req);

    // Only super admins can initialize feature flags
    if (user.role.name !== UserRoleName.SUPER_ADMIN) {
      return res.status(403).json({
        message:
          "Access denied: Only super admins can initialize feature flags",
      });
    }

    // Initialize default feature flags
    await initializeDefaultFeatureFlags(user._id.toString());

    return res.status(200).json({
      message: "Feature flags initialized successfully",
      initializedBy: user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error initializing feature flags:", error);

    if (error.message === "Authentication required") {
      return res.status(401).json({ message: "Authentication required" });
    }

    return res.status(500).json({
      message: "Failed to initialize feature flags",
      error: error.message,
    });
  }
}
