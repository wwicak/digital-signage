import { displayMonitoringService } from "./services/DisplayMonitoringService";
import { notificationService } from "./services/NotificationService";

/**
 * Initialize the display monitoring system
 * This should be called when the application starts
 */
export async function initializeMonitoring(): Promise<void> {
  try {
    console.log("Initializing display monitoring system...");

    // Configure notification service
    notificationService.updateConfig({
      email: {
        enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === "true",
        recipients: process.env.EMAIL_RECIPIENTS?.split(",") || [],
      },
      webhook: {
        enabled: process.env.WEBHOOK_NOTIFICATIONS_ENABLED === "true",
        url: process.env.WEBHOOK_URL || "",
        headers: {
          Authorization: process.env.WEBHOOK_AUTH_HEADER || "",
        },
      },
      sms: {
        enabled: process.env.SMS_NOTIFICATIONS_ENABLED === "true",
        provider: "twilio",
        config: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER,
        },
        recipients: process.env.SMS_RECIPIENTS?.split(",") || [],
      },
    });

    // Configure monitoring service
    displayMonitoringService.updateConfig({
      heartbeatTimeoutMinutes: parseInt(
        process.env.HEARTBEAT_TIMEOUT_MINUTES || "2"
      ),
      offlineAlertThresholdMinutes: parseInt(
        process.env.OFFLINE_ALERT_THRESHOLD_MINUTES || "5"
      ),
      performanceThresholdMs: parseInt(
        process.env.PERFORMANCE_THRESHOLD_MS || "5000"
      ),
      maxConsecutiveFailures: parseInt(
        process.env.MAX_CONSECUTIVE_FAILURES || "3"
      ),
      cleanupIntervalHours: parseInt(
        process.env.CLEANUP_INTERVAL_HOURS || "24"
      ),
      notificationCooldownMinutes: parseInt(
        process.env.NOTIFICATION_COOLDOWN_MINUTES || "30"
      ),
    });

    // Start monitoring service
    await displayMonitoringService.start();

    // Set up notification processing interval
    setInterval(async () => {
      try {
        await notificationService.processUnsentNotifications();
      } catch (error) {
        console.error("Error processing notifications:", error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log("Display monitoring system initialized successfully");
  } catch (error) {
    console.error("Failed to initialize display monitoring system:", error);
    throw error;
  }
}

/**
 * Gracefully shutdown the monitoring system
 */
export function shutdownMonitoring(): void {
  try {
    console.log("Shutting down display monitoring system...");
    displayMonitoringService.stop();
    console.log("Display monitoring system shut down successfully");
  } catch (error) {
    console.error("Error shutting down monitoring system:", error);
  }
}

// Auto-initialize in production
if (
  process.env.NODE_ENV === "production" &&
  process.env.AUTO_START_MONITORING === "true"
) {
  initializeMonitoring().catch(console.error);
}

// Handle graceful shutdown
process.on("SIGTERM", shutdownMonitoring);
process.on("SIGINT", shutdownMonitoring);
