import type { NextApiRequest, NextApiResponse } from "next/types";
import { requireAuth } from "@/lib/auth";
import { filterWidgetsByFeatureFlags } from "@/lib/helpers/widget_filter_helper";
import widgets from "@/widgets";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await requireAuth(req);

    // Filter widgets based on user's feature flag access
    const availableWidgets = await filterWidgetsByFeatureFlags(widgets, user);

    // Transform widgets into a format suitable for the frontend
    const widgetChoices = Object.keys(availableWidgets).map((key) => {
      const widgetDef = availableWidgets[key];
      return {
        key: widgetDef.type || key,
        name: widgetDef.name,
        type: widgetDef.type,
        icon: widgetDef.icon?.name || "Square", // Get icon name for serialization
        version: widgetDef.version,
        defaultData: widgetDef.defaultData,
      };
    });

    return res.status(200).json({
      widgets: widgetChoices,
      total: widgetChoices.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching available widgets:", error);

    if (error instanceof Error && error.message === "Authentication required") {
      return res.status(401).json({ message: "Authentication required" });
    }

    return res.status(500).json({
      message: "Failed to fetch available widgets",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
