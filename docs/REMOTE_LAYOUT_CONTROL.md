# Remote Layout Control Feature

## Overview

The Remote Layout Control feature allows administrators to change the layout of connected displays in real-time from the admin panel, without needing physical access to the display devices.

## How It Works

### 1. **Access Remote Control**

- Navigate to **Connected Displays** page (`/screens`)
- Find the display you want to control
- Look for displays with **"Online"** status (green badge)
- Click the **Settings icon** (⚙️) on online displays to expand layout controls

### 2. **Change Layout Remotely**

- **Current Layout**: Shows the layout currently active on the display
- **Change to Layout**: Dropdown to select a new layout
- **Preview Change**: Shows what the change will be (Current → New)
- **Apply Change**: Sends the layout change command to the display
- **Reset**: Cancels the selection and reverts to current layout

### 3. **Real-Time Application**

- Changes are applied **immediately** for online displays
- The display automatically **reloads** with the new layout
- **Success confirmation** appears when the change is sent
- **Error messages** show if something goes wrong

## Technical Implementation

### **API Endpoint**

```
POST /api/v1/displays/{displayId}/change-layout
```

**Request Body:**

```json
{
  "layoutId": "layout-2",
  "immediate": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Layout change requested successfully",
  "display": {
    "id": "display-123",
    "name": "Lobby Display",
    "newLayout": "layout-2",
    "changeRequested": true,
    "changeTimestamp": "2024-01-20T10:30:00Z"
  }
}
```

### **Display Detection Process**

1. **Layout Change Flag**: Server sets `layoutChangeRequested: true` in database
2. **Periodic Checking**: Display checks for layout changes every 10 seconds
3. **SSE Events**: Real-time notifications via Server-Sent Events (optional)
4. **Auto-Reload**: Display reloads when layout change is detected
5. **Flag Clearing**: Change flag is cleared after reload

### **Database Schema Updates**

```typescript
// Display Model additions
{
  layoutChangeRequested: boolean,
  layoutChangeTimestamp: Date,
}
```

## User Interface

### **Connected Displays Page**

- **Info Section**: Explains remote layout control functionality
- **Display Cards**: Show online/offline status
- **Settings Button**: Only visible for online displays
- **Expandable Controls**: Inline layout change interface

### **Layout Control Section** (Expanded)

- **Current Layout Info**: Shows active layout with badge
- **Layout Selector**: Dropdown with available layouts
- **Status Messages**: Success/error feedback
- **Preview Section**: Shows change preview
- **Action Buttons**: Apply Change / Reset
- **Instructions**: Brief usage notes

## Available Layouts

### **Current Layout Options**:

1. **Corporate Announcements** - General corporate communications
2. **Meeting Room Display** - Room booking and meeting information
3. **Lobby Information** - Welcome messages and general information
4. **Emergency Alerts** - Emergency notifications and alerts
5. **Digital Menu Board** - Restaurant menu and pricing

_Note: In production, these would be dynamically loaded from the layouts API_

## Status Indicators

### **Display Status**

- 🟢 **Online**: Display is connected and responsive
- 🔴 **Offline**: Display is not responding to heartbeats
- ⏳ **Changing**: Layout change is in progress

### **Layout Change Status**

- ✅ **Success**: "Layout change sent! The display will update shortly."
- ❌ **Error**: Specific error message (network, authentication, etc.)
- 🔄 **In Progress**: "Applying..." with loading spinner

## User Workflows

### **Facility Manager Workflow**

1. Open Connected Displays page
2. Identify display needing layout change
3. Verify display is online (green badge)
4. Click settings icon to expand controls
5. Select new layout from dropdown
6. Review preview of change
7. Click "Apply Change"
8. Confirm success message
9. Verify display updates within 10 seconds

### **Emergency Response Workflow**

1. Navigate to Connected Displays
2. Select all displays needing emergency layout
3. Change to "Emergency Alerts" layout
4. Apply changes to multiple displays
5. Monitor status confirmations
6. Verify emergency content is displayed

### **Scheduled Content Updates**

1. Plan layout changes in advance
2. Access displays during low-traffic times
3. Apply new layouts systematically
4. Monitor for successful updates
5. Rollback if issues occur

## Error Handling

### **Common Error Scenarios**

- **Display Offline**: "Display is offline. Layout changes will be applied when the display comes back online."
- **Network Error**: "Unable to connect to server. Please check your network connection."
- **Authentication Error**: "Authentication required. Please log in again."
- **Invalid Layout**: "Selected layout is not available."
- **Server Error**: "Server error. Please try again later."

### **Fallback Mechanisms**

- **Offline Queuing**: Changes are queued for offline displays
- **Retry Logic**: Automatic retry for transient failures
- **Manual Refresh**: Users can manually refresh display status
- **Rollback Option**: Reset to previous layout if needed

## Security Considerations

### **Authentication Required**

- All layout change requests require valid authentication
- User permissions are checked before allowing changes
- Audit trail of layout changes is maintained

### **Rate Limiting**

- Layout change requests are rate-limited per user
- Prevents abuse and system overload
- Graceful degradation under high load

### **Validation**

- Layout IDs are validated against available layouts
- Display IDs are verified to exist and be accessible
- Input sanitization prevents injection attacks

## Performance Optimization

### **Efficient Updates**

- **Debounced Requests**: Multiple rapid changes are debounced
- **Minimal Data Transfer**: Only necessary data is sent
- **Caching**: Layout metadata is cached for performance
- **Batch Operations**: Multiple displays can be updated together

### **Real-Time Features**

- **Server-Sent Events**: Immediate notifications when possible
- **Heartbeat Integration**: Leverages existing heartbeat system
- **Optimistic Updates**: UI updates immediately for better UX

## Monitoring and Analytics

### **Usage Tracking**

- Track which layouts are changed most frequently
- Monitor success/failure rates of remote changes
- Identify displays with connectivity issues
- Measure time between change request and application

### **Performance Metrics**

- Average time for layout changes to take effect
- Success rate of remote layout changes
- Network latency for different display locations
- User satisfaction with remote control features

## Future Enhancements

### **Planned Features**

- **Bulk Layout Changes**: Select multiple displays for simultaneous updates
- **Scheduled Changes**: Set layout changes for specific times
- **Layout Previews**: Visual preview of layouts before applying
- **Change History**: Track and revert previous layout changes
- **Mobile App**: Remote control from mobile devices

### **Advanced Capabilities**

- **Conditional Layouts**: Change layouts based on time, weather, events
- **A/B Testing**: Test different layouts on different displays
- **Content Synchronization**: Ensure all displays show coordinated content
- **Emergency Override**: Instant emergency broadcast to all displays

This remote layout control feature significantly improves the operational efficiency of digital signage management by eliminating the need for physical access to displays for layout changes.
