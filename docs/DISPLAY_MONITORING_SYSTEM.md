# Display Monitoring System

A comprehensive real-time monitoring solution for digital signage displays across various hardware platforms including Android TV browsers, mini PCs, and other display devices.

## Features

### 🔍 Real-time Monitoring

- **Live Status Tracking**: Real-time online/offline status for all displays
- **Heartbeat Mechanism**: Robust heartbeat system compatible with Android TV browsers
- **Connection Quality**: Monitor connection type, response times, and network quality
- **Performance Metrics**: Track render times, load times, and error counts

### 📊 Comprehensive Dashboard

- **Visual Status Indicators**: Clear online/offline status with color-coded badges
- **Uptime Tracking**: Historical uptime percentages and statistics
- **Alert Management**: Active alerts with severity levels and acknowledgment
- **Filtering Options**: View offline displays, displays with alerts, or all displays

### 🚨 Intelligent Alerting

- **Configurable Thresholds**: Customizable offline detection (default: 5 minutes)
- **Multiple Alert Types**: Offline, connection lost, performance degraded, heartbeat missed
- **Severity Levels**: Low, medium, high, critical based on conditions
- **Notification Cooldowns**: Prevent notification spam with configurable cooldowns

### 📧 Multi-channel Notifications

- **Email Notifications**: SMTP-based email alerts with detailed information
- **Webhook Integration**: HTTP webhooks for integration with external systems
- **SMS Alerts**: SMS notifications for critical alerts (Twilio integration)
- **Notification History**: Track when and how notifications were sent

### 🔧 Hardware Optimization

- **Android TV Compatible**: Optimized for Android TV browser limitations
- **Low Resource Usage**: Minimal impact on display performance
- **Network Resilience**: Handles network disconnections gracefully
- **Power Detection**: Distinguishes between network issues and power-off situations

## Architecture

### Database Models

#### DisplayStatus

Tracks real-time status of each display:

- Online/offline status
- Last seen timestamp
- Heartbeat information
- Connection details (IP, user agent, type)
- Uptime/downtime tracking
- Consecutive failure count

#### DisplayHeartbeat

Logs heartbeat data for analysis:

- Response times
- Client information (screen resolution, browser, platform)
- Performance metrics
- Server processing times
- Automatic cleanup (7-day retention)

#### DisplayAlert

Manages alert lifecycle:

- Alert types and severity levels
- Trigger conditions
- Acknowledgment tracking
- Notification history
- Auto-resolution capabilities

### Services

#### DisplayMonitoringService

Core monitoring engine that:

- Runs background checks every minute
- Detects offline displays based on heartbeat timeouts
- Creates alerts for various conditions
- Performs automatic data cleanup
- Provides monitoring statistics

#### NotificationService

Handles alert notifications:

- Multi-channel notification support
- Configurable cooldown periods
- Template-based message generation
- Delivery tracking and retry logic

## Setup and Configuration

### 1. Environment Variables

```bash
# Monitoring Configuration
HEARTBEAT_TIMEOUT_MINUTES=2
OFFLINE_ALERT_THRESHOLD_MINUTES=5
PERFORMANCE_THRESHOLD_MS=5000
MAX_CONSECUTIVE_FAILURES=3
CLEANUP_INTERVAL_HOURS=24
NOTIFICATION_COOLDOWN_MINUTES=30

# Auto-start monitoring service
AUTO_START_MONITORING=true

# Email Notifications
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_RECIPIENTS=admin@company.com,ops@company.com

# Webhook Notifications
WEBHOOK_NOTIFICATIONS_ENABLED=true
WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
WEBHOOK_AUTH_HEADER=Bearer your-auth-token

# SMS Notifications (Twilio)
SMS_NOTIFICATIONS_ENABLED=true
SMS_RECIPIENTS=+1234567890,+0987654321
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_NUMBER=+1234567890
```

### 2. Initialize Monitoring

```typescript
import { initializeMonitoring } from "@/lib/monitoring-init";

// Start monitoring when your app starts
await initializeMonitoring();
```

### 3. Add Heartbeat to Displays

```tsx
import DisplayHeartbeat from "@/components/Display/DisplayHeartbeat";

function DisplayComponent({ displayId }) {
  return (
    <div>
      {/* Your display content */}

      {/* Add heartbeat component */}
      <DisplayHeartbeat
        displayId={displayId}
        interval={30000} // 30 seconds
        enabled={true}
        onHeartbeatSent={(success, responseTime) => {
          console.log("Heartbeat:", success, responseTime);
        }}
        onConnectionStatusChange={(isConnected) => {
          console.log("Connection status:", isConnected);
        }}
      />
    </div>
  );
}
```

### 4. Add Monitoring Dashboard

```tsx
import DisplayMonitoringDashboard from "@/components/Monitoring/DisplayMonitoringDashboard";

function MonitoringPage() {
  return (
    <div>
      <DisplayMonitoringDashboard autoRefresh={true} refreshInterval={30000} />
    </div>
  );
}
```

## API Endpoints

### Heartbeat Endpoints

- `POST /api/v1/displays/{id}/heartbeat` - Send heartbeat
- `GET /api/v1/displays/{id}/heartbeat` - Get heartbeat status

### Monitoring Endpoints

- `GET /api/v1/monitoring/stats` - Get monitoring statistics
- `POST /api/v1/monitoring/stats` - Control monitoring service
- `GET /api/v1/monitoring/displays` - Get display statuses
- `POST /api/v1/monitoring/displays` - Manage display statuses

## Usage Examples

### Using the Enhanced useDisplayStatus Hook

```tsx
import { useDisplayStatus } from "@/hooks/useDisplayStatus";

function MyComponent() {
  const {
    displayStatus,
    monitoringStats,
    getDisplayStatus,
    isDisplayOnline,
    getOfflineDisplays,
    refreshStatus,
    isSSEConnected,
  } = useDisplayStatus({
    enableRealTimeUpdates: true,
    refreshInterval: 30000,
    offlineThresholdMinutes: 5,
  });

  const offlineDisplays = getOfflineDisplays();

  return (
    <div>
      <p>Total displays: {Object.keys(displayStatus).length}</p>
      <p>Offline displays: {offlineDisplays.length}</p>
      <p>SSE Connected: {isSSEConnected ? "Yes" : "No"}</p>

      <button onClick={refreshStatus}>Refresh Status</button>
    </div>
  );
}
```

### Manual Heartbeat Sending

```typescript
import { useDisplayStatus } from "@/hooks/useDisplayStatus";

const { sendHeartbeat } = useDisplayStatus();

// Send heartbeat with client info
const success = await sendHeartbeat("display-id", {
  screenResolution: "1920x1080",
  browserVersion: "Chrome 91.0",
  platform: "Android TV",
  connectionQuality: "good",
});
```

## Troubleshooting

### Common Issues

1. **Displays showing offline despite being online**

   - Check heartbeat interval configuration
   - Verify network connectivity
   - Check browser console for heartbeat errors

2. **High false positive alerts**

   - Increase `HEARTBEAT_TIMEOUT_MINUTES`
   - Adjust `OFFLINE_ALERT_THRESHOLD_MINUTES`
   - Check network stability

3. **Missing notifications**

   - Verify notification service configuration
   - Check notification cooldown settings
   - Review email/webhook/SMS credentials

4. **Performance issues on Android TV**
   - Increase heartbeat interval
   - Reduce performance metric collection
   - Check memory usage

### Monitoring Service Status

```bash
# Check if monitoring service is running
curl http://localhost:3000/api/v1/monitoring/stats

# Start monitoring service
curl -X POST http://localhost:3000/api/v1/monitoring/stats \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

# Stop monitoring service
curl -X POST http://localhost:3000/api/v1/monitoring/stats \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

## Best Practices

1. **Heartbeat Intervals**: Use 30-60 seconds for most displays, longer for low-power devices
2. **Alert Thresholds**: Set offline threshold to 2-3x heartbeat interval
3. **Notification Cooldowns**: Use 30+ minutes to prevent spam
4. **Data Retention**: Keep heartbeat data for 7 days, alerts for 30 days
5. **Network Resilience**: Handle network disconnections gracefully
6. **Performance**: Monitor resource usage on display devices

## Security Considerations

- Heartbeat endpoints should be rate-limited
- Use HTTPS for all communications
- Implement proper authentication for monitoring APIs
- Sanitize client-provided data
- Secure webhook endpoints with authentication
- Protect notification credentials

## Future Enhancements

- WebSocket support for real-time updates
- Geographic display grouping
- Advanced analytics and reporting
- Mobile app for monitoring
- Integration with external monitoring tools
- Predictive failure detection
