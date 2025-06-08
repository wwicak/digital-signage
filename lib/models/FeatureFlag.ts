import mongoose, { Schema, Model, Document } from "mongoose";
import * as z from "zod";
import { UserRoleName } from "./User";
import {
  FeatureFlagType,
  FeatureFlagName,
  FeatureFlagTypeZod,
  FeatureFlagNameZod,
  FeatureFlagSchemaZod,
  IFeatureFlagData
} from "../types/feature-flags";

// Re-export types for backward compatibility
export { FeatureFlagType, FeatureFlagName };
export type { IFeatureFlagData };
export { FeatureFlagTypeZod, FeatureFlagNameZod, FeatureFlagSchemaZod };

// Interface for the FeatureFlag document (server-side with Mongoose Document)
export interface IFeatureFlagDocument extends Document {
  name: FeatureFlagName;
  displayName: string;
  description?: string;
  type: FeatureFlagType;
  enabled: boolean;
  allowedRoles: UserRoleName[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureFlagSchema = new Schema<IFeatureFlagDocument>(
  {
    name: {
      type: String,
      enum: Object.values(FeatureFlagName),
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: Object.values(FeatureFlagType),
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    allowedRoles: [{
      type: String,
      enum: Object.values(UserRoleName),
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries (only on server side)
// Note: name index is already created by unique: true
if (typeof window === 'undefined') {
  FeatureFlagSchema.index({ type: 1 });
  FeatureFlagSchema.index({ enabled: 1 });
  FeatureFlagSchema.index({ type: 1, enabled: 1 }); // Compound index for common queries
}

let FeatureFlagModel: Model<IFeatureFlagDocument>;

// Only create the model on the server side
if (typeof window === 'undefined') {
  try {
    FeatureFlagModel = mongoose.models?.FeatureFlag as Model<IFeatureFlagDocument> ||
      mongoose.model<IFeatureFlagDocument>("FeatureFlag", FeatureFlagSchema);
  } catch (error) {
    console.error('Error creating FeatureFlag model:', error);
    throw error;
  }
} else {
  // On client side, export a placeholder
  FeatureFlagModel = {} as Model<IFeatureFlagDocument>;
}

// Server-side Zod schema with mongoose ObjectId support
export const FeatureFlagSchemaZodServer = FeatureFlagSchemaZod.extend({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  createdBy: z.instanceof(mongoose.Types.ObjectId),
});

export type IFeatureFlagServerData = z.infer<typeof FeatureFlagSchemaZodServer>;

export default FeatureFlagModel;
