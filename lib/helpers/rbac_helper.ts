import { AuthenticatedUser } from "../auth";
import { UserRoleName } from "../models/User";
import { hasFeatureFlagAccess } from "./feature_flag_helper";
import { FeatureFlagName } from "../types/feature-flags";
import mongoose from "mongoose";

/**
 * Check if user has permission to perform an action on a resource
 */
export interface Permission {
  action: "create" | "read" | "update" | "delete" | "manage";
  resource:
    | "user"
    | "building"
    | "display"
    | "widget"
    | "slide"
    | "slideshow"
    | "dashboard"
    | "reservation"
    | "room"
    | "calendar"
    | "feature_flag";
  resourceId?: string; // Optional specific resource ID
  featureFlag?: FeatureFlagName; // Optional feature flag to check
}

/**
 * Check if user has required permission
 */
export async function hasPermission(
  user: AuthenticatedUser,
  permission: Permission
): Promise<boolean> {
  const { role } = user;
  const { action, resource, resourceId, featureFlag } = permission;

  // Check feature flag access first if specified
  if (featureFlag) {
    const hasFeatureAccess = await hasFeatureFlagAccess(user, featureFlag);
    if (!hasFeatureAccess) {
      return false;
    }
  }

  // SuperAdmin has all permissions
  if (role.name === UserRoleName.SUPER_ADMIN) {
    return true;
  }

  // ResourceManager permissions
  if (role.name === UserRoleName.RESOURCE_MANAGER) {
    switch (resource) {
      case "user":
        // Can create and manage users
        return ["create", "read", "update", "delete", "manage"].includes(
          action
        );

      case "building":
        // Can manage buildings they are assigned to
        if (resourceId && role.associatedBuildingIds) {
          return role.associatedBuildingIds.some(
            (id) => id.toString() === resourceId
          );
        }
        // Can read all buildings if no specific ID provided
        return action === "read";

      case "display":
        // Can manage displays they are assigned to
        if (resourceId && role.associatedDisplayIds) {
          return role.associatedDisplayIds.some(
            (id) => id.toString() === resourceId
          );
        }
        // Can read all displays if no specific ID provided
        return action === "read";

      case "widget":
      case "slide":
      case "slideshow":
        // Can manage content for displays they manage
        return ["create", "read", "update", "delete", "manage"].includes(
          action
        );

      case "dashboard":
      case "reservation":
      case "room":
      case "calendar":
        // Can manage meeting room system
        return ["create", "read", "update", "delete", "manage"].includes(
          action
        );

      case "feature_flag":
        // Only SuperAdmin can manage feature flags, but ResourceManager can read
        return action === "read";

      default:
        return false;
    }
  }

  // DisplayManager permissions
  if (role.name === UserRoleName.DISPLAY_MANAGER) {
    switch (resource) {
      case "display":
        // Can only manage displays they are assigned to
        if (resourceId && role.associatedDisplayIds) {
          return role.associatedDisplayIds.some(
            (id) => id.toString() === resourceId
          );
        }
        return false;

      case "widget":
      case "slide":
      case "slideshow":
        // Can manage content for their assigned displays
        return ["create", "read", "update", "delete", "manage"].includes(
          action
        );

      default:
        return false;
    }
  }

  // Viewer permissions
  if (role.name === UserRoleName.VIEWER) {
    switch (resource) {
      case "display":
      case "widget":
      case "slide":
      case "slideshow":
        // Can only read content for displays they have access to
        if (action === "read") {
          if (resourceId && role.associatedDisplayIds) {
            return role.associatedDisplayIds.some(
              (id) => id.toString() === resourceId
            );
          }
          return false;
        }
        return false;

      default:
        return false;
    }
  }

  return false;
}

/**
 * Check if user can access a specific display
 */
export async function canAccessDisplay(
  user: AuthenticatedUser,
  displayId: string
): Promise<boolean> {
  return await hasPermission(user, {
    action: "read",
    resource: "display",
    resourceId: displayId,
  });
}

/**
 * Check if user can manage a specific display
 */
export async function canManageDisplay(
  user: AuthenticatedUser,
  displayId: string
): Promise<boolean> {
  return await hasPermission(user, {
    action: "manage",
    resource: "display",
    resourceId: displayId,
  });
}

/**
 * Check if user can create users
 */
export async function canCreateUsers(user: AuthenticatedUser): Promise<boolean> {
  return await hasPermission(user, {
    action: "create",
    resource: "user",
  });
}

/**
 * Check if user can manage buildings
 */
export async function canManageBuilding(
  user: AuthenticatedUser,
  buildingId?: string
): Promise<boolean> {
  return await hasPermission(user, {
    action: "manage",
    resource: "building",
    resourceId: buildingId,
  });
}

/**
 * Get displays that a user has access to
 */
export function getAccessibleDisplayIds(user: AuthenticatedUser): string[] {
  const { role } = user;

  // SuperAdmin can access all displays (return empty array to indicate "all")
  if (role.name === UserRoleName.SUPER_ADMIN) {
    return [];
  }

  // Return the user's associated display IDs
  return (role.associatedDisplayIds || []).map((id) => id.toString());
}

/**
 * Get buildings that a user has access to
 */
export function getAccessibleBuildingIds(user: AuthenticatedUser): string[] {
  const { role } = user;

  // SuperAdmin can access all buildings (return empty array to indicate "all")
  if (role.name === UserRoleName.SUPER_ADMIN) {
    return [];
  }

  // Return the user's associated building IDs
  return (role.associatedBuildingIds || []).map((id) => id.toString());
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(permission: Permission) {
  return async (user: AuthenticatedUser) => {
    const hasAccess = await hasPermission(user, permission);
    if (!hasAccess) {
      throw new Error(
        `Access denied: Missing required permission ${permission.action} on ${permission.resource}`
      );
    }
  };
}

/**
 * Filter query based on user's access rights
 */
export function addAccessFilter(
  user: AuthenticatedUser,
  resource: "display" | "building",
  query: any = {}
): any {
  // SuperAdmin can access everything
  if (user.role.name === UserRoleName.SUPER_ADMIN) {
    return query;
  }

  if (resource === "display") {
    const accessibleDisplayIds = getAccessibleDisplayIds(user);
    if (accessibleDisplayIds.length > 0) {
      query._id = {
        $in: accessibleDisplayIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } else {
      // User has no display access, return query that matches nothing
      query._id = { $in: [] };
    }
  }

  if (resource === "building") {
    const accessibleBuildingIds = getAccessibleBuildingIds(user);
    if (accessibleBuildingIds.length > 0) {
      query._id = {
        $in: accessibleBuildingIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } else {
      // User has no building access, return query that matches nothing
      query._id = { $in: [] };
    }
  }

  return query;
}

/**
 * Check if user can manage feature flags
 */
export async function canManageFeatureFlags(user: AuthenticatedUser): Promise<boolean> {
  return await hasPermission(user, {
    action: "manage",
    resource: "feature_flag",
  });
}

/**
 * Check if user can read feature flags
 */
export async function canReadFeatureFlags(user: AuthenticatedUser): Promise<boolean> {
  return await hasPermission(user, {
    action: "read",
    resource: "feature_flag",
  });
}
