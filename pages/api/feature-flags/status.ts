import dbConnect from "@/lib/mongodb";
import FeatureFlag from "@/lib/models/FeatureFlag";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // Count feature flags by type
    const totalFlags = await FeatureFlag.countDocuments();
    const menuFlags = await FeatureFlag.countDocuments({ type: "menu_item" });
    const widgetFlags = await FeatureFlag.countDocuments({ type: "widget" });
    const featureFlags = await FeatureFlag.countDocuments({ type: "feature" });
    const enabledFlags = await FeatureFlag.countDocuments({ enabled: true });

    const isInitialized = totalFlags > 0;

    return res.status(200).json({
      initialized: isInitialized,
      statistics: {
        total: totalFlags,
        enabled: enabledFlags,
        disabled: totalFlags - enabledFlags,
        byType: {
          menuItems: menuFlags,
          widgets: widgetFlags,
          features: featureFlags,
        },
      },
      message: isInitialized
        ? "Feature flags are initialized and ready to use"
        : "Feature flags have not been initialized yet",
    });
  } catch (error: any) {
    console.error("Error checking feature flag status:", error);

    return res.status(500).json({
      initialized: false,
      message: "Failed to check feature flag status",
      error: error.message,
    });
  }
}
