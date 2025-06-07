# Role-Based Access Control (RBAC) System

This document describes the implementation of the Role-Based Access Control (RBAC) system for the digital signage application.

## Overview

The RBAC system provides fine-grained access control based on user roles and their associated resources (buildings and displays). The system supports four distinct roles with different permission levels.

## Roles and Permissions

### 1. SuperAdmin

- **Full System Access**: Can manage all users, buildings, and displays
- **User Management**: Can create, read, update, and delete any user
- **Role Assignment**: Can assign any role to any user, including other SuperAdmin roles
- **Resource Access**: Has access to all buildings and displays in the system

### 2. ResourceManager

- **User Management**: Can create and manage users within their scope
- **Limited Role Assignment**: Can assign DisplayManager and Viewer roles for resources they manage
- **Building Management**: Can manage buildings they are assigned to
- **Display Management**: Can manage displays they are assigned to
- **Content Management**: Can manage widgets, slides, and slideshows for their displays

### 3. DisplayManager

- **Display Content**: Can manage content, layout, widgets, and settings for assigned displays
- **No User Management**: Cannot create or manage users
- **Limited Scope**: Only has access to specifically assigned displays

### 4. Viewer (Default)

- **Read-Only Access**: Can only view content of assigned displays
- **No Management**: Cannot create, update, or delete any resources
- **Limited Scope**: Only has access to specifically assigned displays

## Data Model

### User Role Structure

```typescript
interface IUserRole {
  name: UserRoleName; // SuperAdmin | ResourceManager | DisplayManager | Viewer
  associatedBuildingIds?: mongoose.Types.ObjectId[]; // For ResourceManager
  associatedDisplayIds?: mongoose.Types.ObjectId[]; // For ResourceManager, DisplayManager, Viewer
}
```

### User Document

```typescript
interface IUser extends Document {
  name?: string;
  email?: string;
  role: IUserRole;
  username?: string;
}
```

## API Endpoints

### User Management

#### Create User

```http
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": {
    "name": "DisplayManager",
    "associatedDisplayIds": ["507f1f77bcf86cd799439011"]
  }
}
```

#### Get Users (with pagination)

```http
GET /api/users?page=1&limit=10
```

#### Get Single User

```http
GET /api/users/507f1f77bcf86cd799439011
```

#### Update User Role

```http
PUT /api/users/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "role": {
    "name": "ResourceManager",
    "associatedBuildingIds": ["507f1f77bcf86cd799439012"],
    "associatedDisplayIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439013"]
  }
}
```

#### Delete User

```http
DELETE /api/users/507f1f77bcf86cd799439011
```

### Display Management (Updated with RBAC)

The existing display endpoints (`/api/displays` and `/api/displays/[id]`) have been updated to use the RBAC system. Access is now controlled based on user roles and their associated display permissions.

## Usage Examples

### 1. Creating a Building Administrator

```javascript
// Create a ResourceManager for specific buildings
const response = await fetch("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "building.admin@company.com",
    password: "securepassword",
    name: "Building Administrator",
    role: {
      name: "ResourceManager",
      associatedBuildingIds: ["building1_id", "building2_id"],
      associatedDisplayIds: ["display1_id", "display2_id", "display3_id"],
    },
  }),
});
```

### 2. Creating a Display Content Manager

```javascript
// Create a DisplayManager for specific displays
const response = await fetch("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "content.manager@company.com",
    password: "securepassword",
    name: "Content Manager",
    role: {
      name: "DisplayManager",
      associatedDisplayIds: ["display1_id", "display2_id"],
    },
  }),
});
```

### 3. Creating a Viewer

```javascript
// Create a Viewer with read-only access to specific displays
const response = await fetch("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "viewer@company.com",
    password: "securepassword",
    name: "Display Viewer",
    role: {
      name: "Viewer",
      associatedDisplayIds: ["display1_id"],
    },
  }),
});
```

## Permission Checking

The system uses helper functions to check permissions:

```typescript
import {
  hasPermission,
  canAccessDisplay,
  canManageDisplay,
} from "@/lib/helpers/rbac_helper";

// Check general permission
const canCreateUsers = hasPermission(user, {
  action: "create",
  resource: "user",
});

// Check display-specific access
const canView = canAccessDisplay(user, displayId);
const canModify = canManageDisplay(user, displayId);
```

## Setup Instructions

### 1. Create Initial SuperAdmin User

Run the admin user creation script:

```bash
# Using environment variables
ADMIN_EMAIL=admin@yourcompany.com ADMIN_PASSWORD=supersecurepassword npx ts-node scripts/create-admin-user.ts

# Or using defaults (admin@example.com / admin123)
npx ts-node scripts/create-admin-user.ts
```

### 2. Environment Variables

Set the following environment variables for the admin creation script:

```env
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=supersecurepassword
ADMIN_NAME=Super Administrator
```

## Security Considerations

1. **Password Requirements**: Minimum 6 characters (configurable in validation schema)
2. **Role Hierarchy**: Non-SuperAdmin users cannot create SuperAdmin accounts
3. **Self-Modification Protection**: Users cannot modify their own roles (except SuperAdmin)
4. **Resource Scope**: Users can only assign resources they themselves manage
5. **Access Validation**: All API endpoints validate user permissions before proceeding

## Migration Notes

### Existing Users

If you have existing users in your database, they will need to be migrated to the new role structure. Create a migration script to:

1. Update existing users to have the new role object structure
2. Assign appropriate roles based on their current access level
3. Associate them with relevant buildings/displays

### Backward Compatibility

The system maintains backward compatibility by:

1. Providing default role values for new users (`Viewer`)
2. Gracefully handling missing role fields
3. Preserving existing authentication mechanisms

## Error Handling

The API returns appropriate HTTP status codes:

- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (duplicate email, etc.)
- `500`: Internal Server Error

## Testing

Create test users with different roles to verify the RBAC system:

```bash
# Test the user creation endpoint
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "role": {
      "name": "Viewer",
      "associatedDisplayIds": ["DISPLAY_ID"]
    }
  }'
```

## Future Enhancements

1. **Fine-grained Permissions**: Add more specific permissions (e.g., read-only content management)
2. **Time-based Access**: Implement temporary access grants
3. **Audit Logging**: Track all permission changes and access attempts
4. **Role Templates**: Create predefined role templates for common use cases
5. **Group Management**: Implement user groups for easier bulk permission management
