import { NextApiRequest, NextApiResponse } from "next";
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
import mongoose from "mongoose";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();
    const user = await requireAuth(req);

    const { id } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(400).json({ message: "Invalid feature flag ID" });
    }

    if (req.method === "GET") {
      // Check if user can read feature flags
      const canRead = await canReadFeatureFlags(user);
      if (!canRead) {
        return res
          .status(403)
          .json({ message: "Access denied: Cannot read feature flags" });
      }

      const featureFlag = await FeatureFlag.findById(id);

      if (!featureFlag) {
        return res.status(404).json({ message: "Feature flag not found" });
      }

      return res.status(200).json(featureFlag);
    }

    if (req.method === "PUT") {
      // Check if user can manage feature flags
      const canManage = await canManageFeatureFlags(user);
      if (!canManage) {
        return res
          .status(403)
          .json({ message: "Access denied: Cannot update feature flags" });
      }

      const body = req.body;

      // Find the existing feature flag
      const existingFlag = await FeatureFlag.findById(id);
      if (!existingFlag) {
        return res.status(404).json({ message: "Feature flag not found" });
      }

      // Validate the request body (partial update)
      const updateData = {
        ...body,
        name: existingFlag.name, // Don't allow name changes
      };

      const parseResult =
        FeatureFlagSchemaZodServer.partial().safeParse(updateData);

      if (!parseResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parseResult.error.flatten(),
        });
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

      return res.status(200).json(updatedFlag);
    }

    if (req.method === "DELETE") {
      // Check if user can manage feature flags
      const canManage = await canManageFeatureFlags(user);
      if (!canManage) {
        return res
          .status(403)
          .json({ message: "Access denied: Cannot delete feature flags" });
      }

      const deletedFlag = await FeatureFlag.findByIdAndDelete(id);

      if (!deletedFlag) {
        return res.status(404).json({ message: "Feature flag not found" });
      }

      // Clear cache to ensure deletion is reflected immediately
      clearFeatureFlagCache();

      return res.status(200).json({
        message: "Feature flag deleted successfully",
        deletedFlag,
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: unknown) {
    console.error("Error handling feature flag:", error);

    if (error instanceof Error && error.message === "Authentication required") {
      return res.status(401).json({ message: "Authentication required" });
    }

    return res.status(500).json({
      message: "Failed to handle feature flag request",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
