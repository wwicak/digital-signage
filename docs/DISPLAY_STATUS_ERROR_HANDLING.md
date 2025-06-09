# Display Status Error Handling & User Experience

## Overview

Enhanced error handling and user-friendly messaging for the DisplayStatusCard component to provide clear guidance when displays are not available, offline, or when errors occur.

## Error States and Messages

### 1. **Network Connection Errors**

**Trigger:** `Failed to fetch`, `ERR_NETWORK`, `NetworkError`
**Message:** "Unable to connect to server"
**Description:** "Please check your network connection and try again."
**Actions:** Retry button available

### 2. **No Displays Configured**

**Trigger:** `totalCount === 0` (no displays exist)
**Message:**

- General: "No displays configured"
- Layout-specific: "No displays assigned to this layout"
  **Description:**
- General: "Create and configure your first display to get started"
- Layout-specific: "Assign displays to this layout to monitor their status here"
  **Guidance:**
- Create a new display from the displays page
- Configure display settings and assign layouts
- Connect your display devices to start monitoring

### 3. **All Displays Offline**

**Trigger:** `onlineCount === 0` but `totalCount > 0`
**Message:**

- General: "No displays currently online"
- Layout-specific: "All displays for this layout are currently offline"
  **Description:** "All configured displays are currently offline or disconnected"
  **Guidance:**
- Check display device power and network connections
- Verify display URLs are accessible
- Review display configuration settings

### 4. **Authentication Errors**

**Trigger:** HTTP 401/403 responses
**Message:** "Authentication required" or "Access denied"
**Description:** Context-specific authentication guidance
**Actions:** Retry button (may redirect to login)

### 5. **Server Errors**

**Trigger:** HTTP 500+ responses
**Message:** "Server error"
**Description:** "Please try again later"
**Actions:** Retry button with exponential backoff

## Component Structure

### EmptyDisplayState Component

```typescript
interface EmptyDisplayStateProps {
  layoutId?: string;
  totalCount: number;
  onlineCount: number;
  error?: string | null;
}
```

**Features:**

- Context-aware messaging based on layout vs. global view
- Visual icons that match the error type
- Actionable guidance for each scenario
- Color-coded states (error=red, offline=orange, empty=muted)

### Error Message Variants

#### Error Variant (Red)

- Network connection issues
- Server errors
- Authentication problems

#### Offline Variant (Orange)

- Displays exist but are offline
- Connection issues with specific displays

#### Empty Variant (Muted)

- No displays configured
- No displays assigned to layout

## User Experience Improvements

### 1. **Progressive Error Messages**

- Start with simple, user-friendly messages
- Provide technical details only when necessary
- Include actionable next steps

### 2. **Visual Feedback**

- Appropriate icons for each state (Monitor, WifiOff, AlertTriangle)
- Color coding to indicate severity
- Loading states with spinners

### 3. **Interactive Elements**

- Retry buttons for recoverable errors
- Refresh functionality with loading states
- Clear visual feedback during operations

### 4. **Contextual Guidance**

- Different messages for layout-specific vs. global views
- Step-by-step instructions for setup
- Troubleshooting tips for common issues

## API Error Handling

### Enhanced Error Responses

```typescript
// Before
{ message: "Error fetching displays" }

// After
{
  message: "Database connection error. Please try again.",
  error: "MongoNetworkError: ...", // dev only
  timestamp: "2024-01-01T12:00:00Z",
  meta: {
    total: 0,
    online: 0,
    offline: 0
  }
}
```

### Status Code Mapping

- **401**: "Authentication required. Please log in again."
- **403**: "Access denied. You don't have permission to view displays."
- **404**: "Display service not found."
- **500+**: "Server error. Please try again later."
- **503**: "Database connection error. Please try again."

## React Query Configuration

### Retry Logic

```typescript
retry: (failureCount, error: any) => {
  // Don't retry on network errors or client errors
  if (
    error.message.includes("Failed to fetch") ||
    error.message.includes("ERR_NETWORK") ||
    error.message.includes("Authentication required") ||
    error.message.includes("Access denied")
  ) {
    return false;
  }
  return failureCount < 2;
};
```

### Error Boundaries

- Network errors: No retry, show connection message
- Auth errors: No retry, redirect to login
- Server errors: Limited retry with exponential backoff
- Client errors: No retry, show specific guidance

## Testing Scenarios

### 1. **Network Disconnection**

- Disconnect internet
- Verify "Unable to connect to server" message
- Verify retry button functionality

### 2. **Fresh Installation**

- Empty database
- Verify "No displays configured" message
- Verify setup guidance

### 3. **All Displays Offline**

- Configure displays but keep them offline
- Verify "No displays currently online" message
- Verify troubleshooting guidance

### 4. **Layout-Specific Views**

- Test with empty layout
- Test with layout containing offline displays
- Verify layout-specific messaging

### 5. **Server Errors**

- Simulate 500 errors
- Verify error handling and retry logic
- Test exponential backoff

## Implementation Files

### Modified Files

- `components/Admin/DisplayStatusCard.tsx` - Enhanced error UI
- `hooks/useLayoutDisplayStatus.ts` - Better error handling
- `app/api/displays/route.ts` - Improved error responses

### New Components

- `EmptyDisplayState` - Comprehensive empty state handling
- Enhanced error messaging system
- Contextual guidance system

### Test Files

- `app/test-display-status/page.tsx` - Test different scenarios

## User Flow Examples

### First-Time User

1. Opens display status → "No displays configured"
2. Sees setup instructions
3. Clicks to create first display
4. Returns to see display status

### Network Issue

1. Loses connection → "Unable to connect to server"
2. Sees connection troubleshooting
3. Clicks retry when connection restored
4. Successfully loads display data

### Offline Displays

1. All displays go offline → "No displays currently online"
2. Sees troubleshooting steps
3. Fixes display connections
4. Refreshes to see online status

## Accessibility

### Screen Reader Support

- Descriptive error messages
- Proper ARIA labels
- Semantic HTML structure

### Keyboard Navigation

- Retry buttons are keyboard accessible
- Proper focus management
- Tab order preservation

### Visual Accessibility

- High contrast error states
- Clear visual hierarchy
- Appropriate color coding

## Future Enhancements

### Potential Improvements

1. **Real-time error recovery** - Auto-retry when connection restored
2. **Detailed diagnostics** - Network connectivity tests
3. **Guided setup wizard** - Step-by-step display configuration
4. **Error analytics** - Track common error patterns
5. **Offline mode** - Cached display status when offline

This enhanced error handling provides a much better user experience by giving clear, actionable feedback for all possible states of the display monitoring system.
