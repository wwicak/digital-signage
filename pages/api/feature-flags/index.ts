import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import FeatureFlag, {
  FeatureFlagSchemaZodServer,
} from "@/lib/models/FeatureFlag";

import {
  canManageFeatureFlags,
  canReadFeatureFlags,
} from "@/lib/helpers/rbac_helper";
import { clearFeatureFlagCache } from "@/lib/helpers/feature_flag_helper";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();
    const user = await requireAuth(req);

    if (req.method === "GET") {
      // Check if user can read feature flags
      const canRead = await canReadFeatureFlags(user);
      if (!canRead) {
        return res
          .status(403)
          .json({ message: "Access denied: Cannot read feature flags" });
      }

      const { type, enabled } = req.query;

      // Build query
      const query: any = {};
      if (type) {
        query.type = type;
      }
      if (enabled !== undefined) {
        query.enabled = enabled === "true";
      }

      const featureFlags = await FeatureFlag.find(query).sort({
        type: 1,
        name: 1,
      });

      return res.status(200).json(featureFlags);
    }

    if (req.method === "POST") {
      // Check if user can manage feature flags
      const canManage = await canManageFeatureFlags(user);
      if (!canManage) {
        return res
          .status(403)
          .json({ message: "Access denied: Cannot create feature flags" });
      }

      const body = req.body;

      // Validate the request body
      const parseResult = FeatureFlagSchemaZodServer.safeParse({
        ...body,
        createdBy: user._id,
      });

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parseResult.error.flatten(),
        });
      }

      const { name, displayName, description, type, enabled, allowedRoles } =
        parseResult.data;

      // Check if feature flag already exists
      const existingFlag = await FeatureFlag.findOne({ name });
      if (existingFlag) {
        return res
          .status(409)
          .json({ message: "Feature flag with this name already exists" });
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

      return res.status(201).json(savedFeatureFlag);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: unknown) {
    console.error("Error handling feature flags:", error);

    if (error instanceof Error && error.message === "Authentication required") {
      return res.status(401).json({ message: "Authentication required" });
    }

    return res.status(500).json({
      message: "Failed to handle feature flags request",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
