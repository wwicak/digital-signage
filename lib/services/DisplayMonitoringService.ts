import DisplayStatus from "../models/DisplayStatus";
import DisplayAlert from "../models/DisplayAlert";
import DisplayHeartbeat from "../models/DisplayHeartbeat";
import Display from "../models/Display";
import dbConnect from "../mongodb";

export interface MonitoringConfig {
  heartbeatTimeoutMinutes: number;
  offlineAlertThresholdMinutes: number;
  performanceThresholdMs: number;
  maxConsecutiveFailures: number;
  cleanupIntervalHours: number;
  notificationCooldownMinutes: number;
}

// Define DisplayStatus document type
interface DisplayStatusDoc {
  _id: string;
  displayId: {
    _id: string;
    name: string;
  };
  lastSeen: Date;
  lastHeartbeat: Date;
  ipAddress?: string;
  userAgent?: string;
  markOffline(reason: string): Promise<void>;
}

export class DisplayMonitoringService {
  private static instance: DisplayMonitoringService;
  private config: MonitoringConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      heartbeatTimeoutMinutes: 2, // Consider offline after 2 minutes without heartbeat
      offlineAlertThresholdMinutes: 5, // Send alert after 5 minutes offline
      performanceThresholdMs: 5000, // Alert if response time > 5 seconds
      maxConsecutiveFailures: 3, // Alert after 3 consecutive failures
      cleanupIntervalHours: 24, // Cleanup old data every 24 hours
      notificationCooldownMinutes: 30, // Wait 30 minutes between notifications
      ...config,
    };
  }

  public static getInstance(
    config?: Partial<MonitoringConfig>
  ): DisplayMonitoringService {
    if (!DisplayMonitoringService.instance) {
      DisplayMonitoringService.instance = new DisplayMonitoringService(config);
    }
    return DisplayMonitoringService.instance;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Display monitoring service is already running");
      return;
    }

    console.log("Starting display monitoring service...");

    try {
      await dbConnect();

      // Initial check
      await this.checkDisplayStatuses();

      // Set up monitoring interval (every minute)
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.checkDisplayStatuses();
        } catch (error) {
          console.error("Error in monitoring interval:", error);
        }
      }, 60 * 1000); // 1 minute

      // Set up cleanup interval
      this.cleanupInterval = setInterval(async () => {
        try {
          await this.performCleanup();
        } catch (error) {
          console.error("Error in cleanup interval:", error);
        }
      }, this.config.cleanupIntervalHours * 60 * 60 * 1000);

      this.isRunning = true;
      console.log("Display monitoring service started successfully");
    } catch (error) {
      console.error("Failed to start display monitoring service:", error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log("Display monitoring service is not running");
      return;
    }

    console.log("Stopping display monitoring service...");

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    console.log("Display monitoring service stopped");
  }

  public isServiceRunning(): boolean {
    return this.isRunning;
  }

  private async checkDisplayStatuses(): Promise<void> {
    try {
      const timeoutMs = this.config.heartbeatTimeoutMinutes * 60 * 1000;
      const alertThresholdMs =
        this.config.offlineAlertThresholdMinutes * 60 * 1000;
      const cutoffTime = new Date(Date.now() - timeoutMs);
      const alertCutoffTime = new Date(Date.now() - alertThresholdMs);

      // Find displays that should be considered offline
      const staleStatuses = await DisplayStatus.find({
        $or: [
          { lastHeartbeat: { $lt: cutoffTime }, isOnline: true },
          { lastSeen: { $lt: cutoffTime }, isOnline: true },
        ],
      }).populate("displayId");

      for (const status of staleStatuses) {
        await this.handleOfflineDisplay(status, alertCutoffTime);
      }

      // Check for displays with consecutive failures
      const failingDisplays = await DisplayStatus.find({
        consecutiveFailures: { $gte: this.config.maxConsecutiveFailures },
        isOnline: true,
      }).populate("displayId");

      for (const status of failingDisplays) {
        await this.handleFailingDisplay(status as DisplayStatusDoc); // Type assertion for populated document
      }
    } catch (error) {
      console.error("Error checking display statuses:", error);
    }
  }

  private async handleOfflineDisplay(
    status: DisplayStatusDoc,
    alertCutoffTime: Date
  ): Promise<void> {
    try {
      // Determine disconnection reason
      const timeSinceLastSeen = Date.now() - status.lastSeen.getTime();
      const timeSinceLastHeartbeat =
        Date.now() - status.lastHeartbeat.getTime();

      let disconnectionReason = "timeout";

      // If last heartbeat is much older than last seen, likely a network issue
      if (timeSinceLastHeartbeat > timeSinceLastSeen + 60000) {
        // 1 minute difference
        disconnectionReason = "network_error";
      }

      // If both are very old, likely power off
      if (timeSinceLastSeen > 10 * 60 * 1000) {
        // 10 minutes
        disconnectionReason = "power_off";
      }

      // Mark display as offline
      await status.markOffline(disconnectionReason);

      // Create alert if display has been offline long enough
      if (status.lastSeen < alertCutoffTime) {
        const offlineMinutes = Math.floor(timeSinceLastSeen / (60 * 1000));

        // Check if we already have an active offline alert
        const existingAlert = await DisplayAlert.findOne({
          displayId: status.displayId._id,
          alertType: "offline",
          isActive: true,
        });

        if (!existingAlert) {
          await DisplayAlert.createOfflineAlert(
            status.displayId._id.toString(),
            offlineMinutes,
            {
              lastSeen: status.lastSeen,
              errorDetails: disconnectionReason,
              clientInfo: {
                ip: status.ipAddress,
                userAgent: status.userAgent,
                lastHeartbeat: status.lastHeartbeat?.toISOString(),
              }
            }
          );

          console.log(
            `Created offline alert for display ${status.displayId.name} (${offlineMinutes} minutes)`
          );
        }
      }
    } catch (error) {
      console.error(
        `Error handling offline display ${status.displayId?._id}:`,
        error
      );
    }
  }

  private async handleFailingDisplay(status: DisplayStatusDoc): Promise<void> { // Use typed status document
    try {
      // Check if we already have an active connection alert
      const existingAlert = await DisplayAlert.findOne({
        displayId: status.displayId._id,
        alertType: "connection_lost",
        isActive: true,
      });

      if (!existingAlert) {
        await DisplayAlert.create({
          displayId: status.displayId._id,
          alertType: "connection_lost",
          severity: status.consecutiveFailures > 5 ? "high" : "medium",
          title: "Connection Issues",
          message: `Display has ${status.consecutiveFailures} consecutive connection failures`,
          triggerConditions: {
            consecutiveFailures: status.consecutiveFailures,
          },
          metadata: {
            lastSeen: status.lastSeen,
            lastHeartbeat: status.lastHeartbeat,
            ipAddress: status.ipAddress,
            userAgent: status.userAgent,
          },
        });

        console.log(
          `Created connection alert for display ${status.displayId.name} (${status.consecutiveFailures} failures)`
        );
      }
    } catch (error) {
      console.error(
        `Error handling failing display ${status.displayId?._id}:`,
        error
      );
    }
  }

  private async performCleanup(): Promise<void> {
    try {
      console.log("Performing monitoring data cleanup...");

      // Clean up old heartbeats (keep last 7 days)
      const heartbeatResult = await DisplayHeartbeat.cleanupOldHeartbeats(7);
      console.log(
        `Cleaned up ${heartbeatResult.deletedCount} old heartbeat records`
      );

      // Clean up resolved alerts older than 30 days
      const alertCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const alertResult = await DisplayAlert.deleteMany({
        isActive: false,
        resolvedAt: { $lt: alertCutoff },
      });
      console.log(`Cleaned up ${alertResult.deletedCount} old alert records`);

      console.log("Monitoring data cleanup completed");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  // Define monitoring stats interface
  interface MonitoringStats {
    totalDisplays: number;
    onlineDisplays: number;
    offlineDisplays: number;
    activeAlerts: number;
    recentHeartbeats: Array<{
      displayId: string;
      displayName: string;
      timestamp: Date;
      responseTime: number;
    }>;
    displayHealth: Array<{
      displayId: string;
      status: string;
      uptime: number;
      consecutiveFailures: number;
    }>;
  }

  public async getMonitoringStats(): Promise<MonitoringStats> { // Return typed stats
    try {
      await dbConnect();

      const [
        totalDisplays,
        onlineDisplays,
        offlineDisplays,
        activeAlerts,
        recentHeartbeats,
      ] = await Promise.all([
        Display.countDocuments({}),
        DisplayStatus.countDocuments({ isOnline: true }),
        DisplayStatus.countDocuments({ isOnline: false }),
        DisplayAlert.countDocuments({ isActive: true }),
        DisplayHeartbeat.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        }),
      ]);

      return {
        displays: {
          total: totalDisplays,
          online: onlineDisplays,
          offline: offlineDisplays,
          uptimePercentage:
            totalDisplays > 0 ? (onlineDisplays / totalDisplays) * 100 : 100,
        },
        alerts: {
          active: activeAlerts,
        },
        heartbeats: {
          lastHour: recentHeartbeats,
        },
        service: {
          isRunning: this.isRunning,
          config: this.config,
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting monitoring stats:", error);
      throw error;
    }
  }

  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("Monitoring service configuration updated:", this.config);
  }
}

// Export singleton instance
export const displayMonitoringService = DisplayMonitoringService.getInstance();
