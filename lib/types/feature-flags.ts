import * as z from "zod";
import { UserRoleName } from "../models/User";

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
  MENU_PRIORITY_VIDEOS = "menu_priority_videos",

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

// Interface for the FeatureFlag (client-safe version without Document)
export interface IFeatureFlag {
  _id?: string;
  name: FeatureFlagName;
  displayName: string;
  description?: string;
  type: FeatureFlagType;
  enabled: boolean;
  allowedRoles: UserRoleName[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Zod schemas for validation
export const FeatureFlagTypeZod = z.nativeEnum(FeatureFlagType);
export const FeatureFlagNameZod = z.nativeEnum(FeatureFlagName);

export const FeatureFlagSchemaZod = z.object({
  _id: z.string().optional(),
  name: FeatureFlagNameZod,
  displayName: z.string().min(1),
  description: z.string().optional(),
  type: FeatureFlagTypeZod,
  enabled: z.boolean().default(true),
  allowedRoles: z.array(z.nativeEnum(UserRoleName)).default([]),
  createdBy: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type IFeatureFlagData = z.infer<typeof FeatureFlagSchemaZod>;
