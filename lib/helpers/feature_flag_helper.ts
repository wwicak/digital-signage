import FeatureFlag, { 
  IFeatureFlag, 
  FeatureFlagName, 
  FeatureFlagType 
} from "../models/FeatureFlag";
import { AuthenticatedUser } from "../auth";
import { UserRoleName } from "../models/User";
import dbConnect from "../mongodb";

// Cache for feature flags to avoid database queries on every check
let featureFlagCache: Map<FeatureFlagName, IFeatureFlag> = new Map();
let cacheLastUpdated: Date | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize default feature flags if they don't exist
 */
export async function initializeDefaultFeatureFlags(createdBy: string): Promise<void> {
  await dbConnect();

  const defaultFlags = [
    // Menu items
    {
      name: FeatureFlagName.MENU_DASHBOARD,
      displayName: "Dashboard Menu",
      description: "Access to the dashboard page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_SCREENS,
      displayName: "Screens Menu",
      description: "Access to the screens management page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_LAYOUT,
      displayName: "Layout Menu",
      description: "Access to the layout editor page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_PREVIEW,
      displayName: "Preview Menu",
      description: "Access to the preview page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER, UserRoleName.VIEWER],
    },
    {
      name: FeatureFlagName.MENU_SLIDESHOWS,
      displayName: "Slideshows Menu",
      description: "Access to the slideshows management page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_BUILDINGS,
      displayName: "Buildings Menu",
      description: "Access to the buildings management page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_ROOMS,
      displayName: "Meeting Rooms Menu",
      description: "Access to the meeting rooms management page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_RESERVATIONS,
      displayName: "Reservations Menu",
      description: "Access to the reservations management page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_CALENDAR_INTEGRATION,
      displayName: "Calendar Sync Menu",
      description: "Access to the calendar integration page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
    {
      name: FeatureFlagName.MENU_USERS,
      displayName: "Users Menu",
      description: "Access to the user management page",
      type: FeatureFlagType.MENU_ITEM,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
    
    // Widgets
    {
      name: FeatureFlagName.WIDGET_MEETING_ROOM,
      displayName: "Meeting Room Widget",
      description: "Meeting room display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_ANNOUNCEMENT,
      displayName: "Announcement Widget",
      description: "Announcement display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_CONGRATS,
      displayName: "Congratulations Widget",
      description: "Congratulations display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_IMAGE,
      displayName: "Image Widget",
      description: "Image display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_LIST,
      displayName: "List Widget",
      description: "List display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_SLIDESHOW,
      displayName: "Slideshow Widget",
      description: "Slideshow display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_WEATHER,
      displayName: "Weather Widget",
      description: "Weather display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_WEB,
      displayName: "Web Widget",
      description: "Web page display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_YOUTUBE,
      displayName: "YouTube Widget",
      description: "YouTube video display widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    {
      name: FeatureFlagName.WIDGET_MEDIA_PLAYER,
      displayName: "Media Player Widget",
      description: "Audio and video media player widget",
      type: FeatureFlagType.WIDGET,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER, UserRoleName.DISPLAY_MANAGER],
    },
    
    // Features
    {
      name: FeatureFlagName.FEATURE_MEETING_ROOMS,
      displayName: "Meeting Rooms Feature",
      description: "Complete meeting room management functionality",
      type: FeatureFlagType.FEATURE,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
    {
      name: FeatureFlagName.FEATURE_CALENDAR_SYNC,
      displayName: "Calendar Sync Feature",
      description: "Calendar integration and synchronization",
      type: FeatureFlagType.FEATURE,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
    {
      name: FeatureFlagName.FEATURE_USER_MANAGEMENT,
      displayName: "User Management Feature",
      description: "User creation and management functionality",
      type: FeatureFlagType.FEATURE,
      enabled: true,
      allowedRoles: [UserRoleName.SUPER_ADMIN, UserRoleName.RESOURCE_MANAGER],
    },
  ];

  for (const flagData of defaultFlags) {
    const existingFlag = await FeatureFlag.findOne({ name: flagData.name });
    if (!existingFlag) {
      await FeatureFlag.create({
        ...flagData,
        createdBy: createdBy,
      });
    }
  }
}

/**
 * Refresh the feature flag cache
 */
export async function refreshFeatureFlagCache(): Promise<void> {
  await dbConnect();
  
  const flags = await FeatureFlag.find({});
  featureFlagCache.clear();
  
  for (const flag of flags) {
    featureFlagCache.set(flag.name, flag);
  }
  
  cacheLastUpdated = new Date();
}

/**
 * Get feature flag from cache or database
 */
async function getFeatureFlag(flagName: FeatureFlagName): Promise<IFeatureFlag | null> {
  // Check if cache needs refresh
  if (!cacheLastUpdated || Date.now() - cacheLastUpdated.getTime() > CACHE_DURATION) {
    await refreshFeatureFlagCache();
  }
  
  return featureFlagCache.get(flagName) || null;
}

/**
 * Check if a user has access to a specific feature flag
 */
export async function hasFeatureFlagAccess(
  user: AuthenticatedUser,
  flagName: FeatureFlagName
): Promise<boolean> {
  // Super admins always have access
  if (user.role.name === UserRoleName.SUPER_ADMIN) {
    return true;
  }

  const flag = await getFeatureFlag(flagName);
  
  if (!flag) {
    // If flag doesn't exist, deny access by default
    return false;
  }
  
  // Check if flag is enabled
  if (!flag.enabled) {
    return false;
  }
  
  // Check if user's role is in allowed roles
  return flag.allowedRoles.includes(user.role.name);
}

/**
 * Get all feature flags accessible to a user
 */
export async function getUserAccessibleFeatureFlags(
  user: AuthenticatedUser,
  type?: FeatureFlagType
): Promise<IFeatureFlag[]> {
  await dbConnect();
  
  // Super admins can see all flags
  if (user.role.name === UserRoleName.SUPER_ADMIN) {
    const query = type ? { type } : {};
    return await FeatureFlag.find(query);
  }
  
  // For other users, filter by their role and enabled status
  const query: any = {
    enabled: true,
    allowedRoles: { $in: [user.role.name] },
  };
  
  if (type) {
    query.type = type;
  }
  
  return await FeatureFlag.find(query);
}

/**
 * Clear the feature flag cache (useful after updates)
 */
export function clearFeatureFlagCache(): void {
  featureFlagCache.clear();
  cacheLastUpdated = null;
}
