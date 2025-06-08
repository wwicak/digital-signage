import { IBaseWidget } from "../../widgets/base_widget";
import { FeatureFlagName } from "../models/FeatureFlag";
import { hasFeatureFlagAccess } from "./feature_flag_helper";
import { AuthenticatedUser } from "../auth";

// Mapping of widget types to their corresponding feature flags
export const WIDGET_FEATURE_FLAG_MAP: Record<string, FeatureFlagName> = {
  "meeting-room": FeatureFlagName.WIDGET_MEETING_ROOM,
  "announcement": FeatureFlagName.WIDGET_ANNOUNCEMENT,
  "congrats": FeatureFlagName.WIDGET_CONGRATS,
  "image": FeatureFlagName.WIDGET_IMAGE,
  "list": FeatureFlagName.WIDGET_LIST,
  "slideshow": FeatureFlagName.WIDGET_SLIDESHOW,
  "weather": FeatureFlagName.WIDGET_WEATHER,
  "web": FeatureFlagName.WIDGET_WEB,
  "youtube": FeatureFlagName.WIDGET_YOUTUBE,
  "media-player": FeatureFlagName.WIDGET_MEDIA_PLAYER,
};

/**
 * Filter widgets based on user's feature flag access
 */
export async function filterWidgetsByFeatureFlags(
  widgets: Record<string, IBaseWidget>,
  user: AuthenticatedUser
): Promise<Record<string, IBaseWidget>> {
  const filteredWidgets: Record<string, IBaseWidget> = {};

  for (const [widgetType, widget] of Object.entries(widgets)) {
    const featureFlag = WIDGET_FEATURE_FLAG_MAP[widgetType];
    
    if (featureFlag) {
      // Check if user has access to this widget's feature flag
      const hasAccess = await hasFeatureFlagAccess(user, featureFlag);
      if (hasAccess) {
        filteredWidgets[widgetType] = widget;
      }
    } else {
      // If no feature flag is defined for this widget, include it by default
      filteredWidgets[widgetType] = widget;
    }
  }

  return filteredWidgets;
}

/**
 * Check if a specific widget type is accessible to a user
 */
export async function canAccessWidget(
  widgetType: string,
  user: AuthenticatedUser
): Promise<boolean> {
  const featureFlag = WIDGET_FEATURE_FLAG_MAP[widgetType];
  
  if (featureFlag) {
    return await hasFeatureFlagAccess(user, featureFlag);
  }
  
  // If no feature flag is defined, allow access by default
  return true;
}

/**
 * Get list of accessible widget types for a user
 */
export async function getAccessibleWidgetTypes(
  user: AuthenticatedUser
): Promise<string[]> {
  const accessibleTypes: string[] = [];

  for (const [widgetType, featureFlag] of Object.entries(WIDGET_FEATURE_FLAG_MAP)) {
    const hasAccess = await hasFeatureFlagAccess(user, featureFlag);
    if (hasAccess) {
      accessibleTypes.push(widgetType);
    }
  }

  return accessibleTypes;
}
