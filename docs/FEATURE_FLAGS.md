# Feature Flag System

The digital signage application includes a comprehensive feature flag system that allows super administrators to control access to specific features for different user roles.

## Overview

The feature flag system provides:
- **Menu Item Control**: Show/hide sidebar navigation items based on user roles
- **Widget Access Control**: Control which widgets are available in the layout editor
- **Feature-level Control**: Enable/disable entire feature sets
- **Role-based Permissions**: Different access levels for different user roles

## Architecture

### Components

1. **Database Model** (`lib/models/FeatureFlag.ts`)
   - Stores feature flag definitions
   - Tracks enabled/disabled status
   - Manages role-based permissions

2. **Helper Functions** (`lib/helpers/feature_flag_helper.ts`)
   - Feature flag access checking
   - Cache management for performance
   - Default flag initialization

3. **RBAC Integration** (`lib/helpers/rbac_helper.ts`)
   - Updated to check feature flags before granting access
   - Async permission checking

4. **Widget Filtering** (`lib/helpers/widget_filter_helper.ts`)
   - Filters available widgets based on feature flags
   - Maps widget types to feature flags

5. **Admin UI** (`app/feature-flags/page.tsx`)
   - Management interface for super admins
   - Toggle flags on/off
   - Manage role permissions

## Feature Flag Types

### Menu Items
- `MENU_DASHBOARD` - Dashboard page access
- `MENU_SCREENS` - Screens management page
- `MENU_LAYOUT` - Layout editor page
- `MENU_PREVIEW` - Preview page
- `MENU_SLIDESHOWS` - Slideshows management
- `MENU_BUILDINGS` - Buildings management
- `MENU_ROOMS` - Meeting rooms management
- `MENU_RESERVATIONS` - Reservations management
- `MENU_CALENDAR_INTEGRATION` - Calendar sync page
- `MENU_USERS` - User management page

### Widgets
- `WIDGET_MEETING_ROOM` - Meeting room display widget
- `WIDGET_ANNOUNCEMENT` - Announcement widget
- `WIDGET_CONGRATS` - Congratulations widget
- `WIDGET_IMAGE` - Image display widget
- `WIDGET_LIST` - List widget
- `WIDGET_SLIDESHOW` - Slideshow widget
- `WIDGET_WEATHER` - Weather widget
- `WIDGET_WEB` - Web page widget
- `WIDGET_YOUTUBE` - YouTube video widget

### Features
- `FEATURE_MEETING_ROOMS` - Complete meeting room functionality
- `FEATURE_CALENDAR_SYNC` - Calendar integration
- `FEATURE_USER_MANAGEMENT` - User creation and management

## User Roles

The system supports the following user roles with different access levels:

1. **SUPER_ADMIN** - Full access to all features and feature flag management
2. **RESOURCE_MANAGER** - Access to most features, can read feature flags
3. **DISPLAY_MANAGER** - Access to display and layout management
4. **VIEWER** - Limited access, mainly viewing capabilities

## Usage

### Checking Feature Flag Access

```typescript
import { hasFeatureFlagAccess, FeatureFlagName } from '@/lib/helpers/feature_flag_helper';

// Check if user has access to a specific feature
const hasAccess = await hasFeatureFlagAccess(user, FeatureFlagName.MENU_ROOMS);
```

### Using Feature Flags in Components

```typescript
import { useFeatureFlagAccess } from '@/hooks/useFeatureFlags';

function MyComponent() {
  const { hasAccess, isLoading } = useFeatureFlagAccess(FeatureFlagName.WIDGET_MEETING_ROOM);
  
  if (!hasAccess) {
    return null; // Don't render if no access
  }
  
  return <div>Feature content</div>;
}
```

### Filtering Widgets

```typescript
import { useWidgetChoices } from '@/hooks/useAvailableWidgets';

function LayoutEditor() {
  const { widgetChoices, isLoading } = useWidgetChoices();
  
  // widgetChoices only contains widgets the user has access to
  return (
    <DropdownButton
      choices={widgetChoices}
      onSelect={handleAddWidget}
    />
  );
}
```

## API Endpoints

### Feature Flag Management
- `GET /api/feature-flags` - List all feature flags
- `POST /api/feature-flags` - Create new feature flag (super admin only)
- `PUT /api/feature-flags/[id]` - Update feature flag (super admin only)
- `DELETE /api/feature-flags/[id]` - Delete feature flag (super admin only)
- `POST /api/feature-flags/initialize` - Initialize default flags (super admin only)

### Widget Access
- `GET /api/widgets/available` - Get widgets available to current user

## Setup and Initialization

### 1. Initialize Default Feature Flags

There are several ways to initialize the default feature flags:

#### Option A: Using the npm script (provides instructions)
```bash
npm run init-feature-flags
```

#### Option B: Via API after logging in as super admin
1. Start your development server: `npm run dev`
2. Log in as a super admin user
3. Make a POST request to: `http://localhost:3000/api/feature-flags/initialize`

#### Option C: Using curl (after obtaining session cookie)
```bash
curl -X POST http://localhost:3000/api/feature-flags/initialize \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie"
```

#### Option D: Check initialization status
```bash
curl http://localhost:3000/api/feature-flags/status
```

### 2. Access the Admin Interface

Super admins can manage feature flags at `/feature-flags`

### 3. Configure Permissions

For each feature flag, you can:
- Enable/disable the flag
- Set which user roles have access
- Update the display name and description

## Performance Considerations

- Feature flags are cached for 5 minutes to reduce database queries
- Cache is automatically cleared when flags are updated
- Sidebar and widget filtering happen client-side after initial load

## Security

- Only super admins can create, update, or delete feature flags
- Resource managers can read feature flags but not modify them
- Feature flag checks are performed server-side for security
- All API endpoints require authentication

## Best Practices

1. **Use Descriptive Names**: Feature flag names should clearly indicate what they control
2. **Group Related Flags**: Use consistent naming patterns (e.g., `MENU_*`, `WIDGET_*`)
3. **Test Thoroughly**: Always test feature flag changes with different user roles
4. **Document Changes**: Update this documentation when adding new feature flags
5. **Monitor Performance**: Watch for performance impacts when adding many feature flags

## Troubleshooting

### Feature Not Showing Despite Being Enabled
1. Check if the user's role is in the `allowedRoles` array
2. Verify the feature flag is enabled
3. Clear the feature flag cache
4. Check browser console for JavaScript errors

### Performance Issues
1. Check if too many feature flag queries are being made
2. Verify caching is working properly
3. Consider increasing cache duration if needed

### Permission Errors
1. Ensure the user has the correct role
2. Check if the feature flag exists in the database
3. Verify API authentication is working

## Migration Guide

When upgrading from a system without feature flags:

1. Run the initialization script to create default flags
2. All existing functionality will remain enabled by default
3. Gradually configure permissions as needed
4. Test with different user roles before deploying to production
