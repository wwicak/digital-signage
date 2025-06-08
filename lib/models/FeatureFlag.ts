import mongoose, { Schema, Model, Document } from "mongoose";
import * as z from "zod";
import { UserRoleName } from "./User";

// Enum for feature flag types
export enum FeatureFlagType {
  MENU_ITEM = "menu_item",
  WIDGET = "widget",
  FEATURE = "feature",
}

// Enum for predefined feature flags
export enum FeatureFlagName {
  // Menu items
  MENU_BUILDINGS = "menu_buildings",
  MENU_ROOMS = "menu_rooms", 
  MENU_RESERVATIONS = "menu_reservations",
  MENU_CALENDAR_INTEGRATION = "menu_calendar_integration",
  MENU_USERS = "menu_users",
  MENU_DASHBOARD = "menu_dashboard",
  MENU_SCREENS = "menu_screens",
  MENU_LAYOUT = "menu_layout",
  MENU_PREVIEW = "menu_preview",
  MENU_SLIDESHOWS = "menu_slideshows",
  
  // Widgets
  WIDGET_MEETING_ROOM = "widget_meeting_room",
  WIDGET_ANNOUNCEMENT = "widget_announcement",
  WIDGET_CONGRATS = "widget_congrats",
  WIDGET_IMAGE = "widget_image",
  WIDGET_LIST = "widget_list",
  WIDGET_SLIDESHOW = "widget_slideshow",
  WIDGET_WEATHER = "widget_weather",
  WIDGET_WEB = "widget_web",
  WIDGET_YOUTUBE = "widget_youtube",
  WIDGET_MEDIA_PLAYER = "widget_media_player",
  
  // Features
  FEATURE_MEETING_ROOMS = "feature_meeting_rooms",
  FEATURE_CALENDAR_SYNC = "feature_calendar_sync",
  FEATURE_USER_MANAGEMENT = "feature_user_management",
}

// Interface for the FeatureFlag document
export interface IFeatureFlag extends Document {
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

const FeatureFlagSchema = new Schema<IFeatureFlag>(
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

// Index for efficient queries
FeatureFlagSchema.index({ name: 1 });
FeatureFlagSchema.index({ type: 1 });
FeatureFlagSchema.index({ enabled: 1 });

const FeatureFlagModel: Model<IFeatureFlag> =
  (mongoose.models?.FeatureFlag as Model<IFeatureFlag>) ||
  mongoose.model<IFeatureFlag>("FeatureFlag", FeatureFlagSchema);

// Zod schemas for validation
export const FeatureFlagTypeZod = z.nativeEnum(FeatureFlagType);
export const FeatureFlagNameZod = z.nativeEnum(FeatureFlagName);
export const UserRoleNameZod = z.nativeEnum(UserRoleName);

export const FeatureFlagSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: FeatureFlagNameZod,
  displayName: z.string().min(1),
  description: z.string().optional(),
  type: FeatureFlagTypeZod,
  enabled: z.boolean().default(true),
  allowedRoles: z.array(UserRoleNameZod).default([]),
  createdBy: z.instanceof(mongoose.Types.ObjectId),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type IFeatureFlagData = z.infer<typeof FeatureFlagSchemaZod>;

export default FeatureFlagModel;
