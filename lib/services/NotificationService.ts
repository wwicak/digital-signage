import DisplayAlert from "../models/DisplayAlert";
import dbConnect from "../mongodb";
import mongoose from "mongoose";

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
    smtpConfig?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
  webhook?: {
    enabled: boolean;
    url: string;
    headers?: Record<string, string>;
  };
  sms?: {
    enabled: boolean;
    provider: "twilio" | "aws-sns";
    config: Record<string, unknown>; // SMS provider configuration
    recipients: string[];
  };
}

export interface AlertNotification {
  alertId: string;
  displayId: string;
  displayName: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>; // Alert metadata
}

export class NotificationService {
  private static instance: NotificationService;
  private config: NotificationConfig;

  private constructor(config?: NotificationConfig) {
    this.config = config || {
      email: { enabled: false, recipients: [] },
      webhook: { enabled: false, url: "" },
      sms: { enabled: false, provider: "twilio", config: {}, recipients: [] },
    };
  }

  public static getInstance(config?: NotificationConfig): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService(config);
    }
    return NotificationService.instance;
  }

  public updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public async sendAlertNotification(alertId: string): Promise<void> {
    try {
      await dbConnect();

      // Get alert details
      const alert = await DisplayAlert.findById(alertId).populate("displayId");
      if (!alert) {
        console.error(`Alert ${alertId} not found`);
        return;
      }

      // Type assertion for populated display document
      interface PopulatedDisplay {
        _id: mongoose.Types.ObjectId;
        name?: string;
      }
      const display = alert.displayId as PopulatedDisplay;
      const notification: AlertNotification = {
        alertId: String(alert._id),
        displayId: display._id.toString(),
        displayName: display.name || `Display ${display._id}`,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.createdAt,
        metadata: alert.metadata,
      };

      // Send notifications based on configuration
      const promises: Promise<void>[] = [];

      if (this.config.email?.enabled) {
        promises.push(this.sendEmailNotification(notification, alert));
      }

      if (this.config.webhook?.enabled) {
        promises.push(this.sendWebhookNotification(notification, alert));
      }

      if (this.config.sms?.enabled) {
        promises.push(this.sendSMSNotification(notification, alert));
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("Error sending alert notification:", error);
    }
  }

  // Define interface for alert document with notification methods
  interface AlertDocument {
    _id: mongoose.Types.ObjectId;
    shouldSendNotification(type: string, cooldownMinutes: number): boolean;
    addNotification(type: string): Promise<void>;
  }

  private async sendEmailNotification(
    notification: AlertNotification,
    alert: AlertDocument
  ): Promise<void> {
    try {
      if (!this.config.email?.recipients.length) {
        console.warn("No email recipients configured");
        return;
      }

      // Check cooldown
      if (!alert.shouldSendNotification("email", 30)) {
        console.log(`Email notification for alert ${alert._id} is in cooldown`);
        return;
      }

      const subject = `[${notification.severity.toUpperCase()}] ${
        notification.title
      } - ${notification.displayName}`;
      const body = this.generateEmailBody(notification);

      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      console.log("Sending email notification:", {
        to: this.config.email.recipients,
        subject,
        body,
      });

      // For now, just log the email content
      // In a real implementation, you would use nodemailer or similar

      // Mark notification as sent
      await alert.addNotification("email");
    } catch (error) {
      console.error("Error sending email notification:", error);
    }
  }

  private async sendWebhookNotification(
    notification: AlertNotification,
    alert: AlertDocument
  ): Promise<void> {
    try {
      if (!this.config.webhook?.url) {
        console.warn("No webhook URL configured");
        return;
      }

      // Check cooldown
      if (!alert.shouldSendNotification("webhook", 5)) {
        console.log(
          `Webhook notification for alert ${alert._id} is in cooldown`
        );
        return;
      }

      const payload = {
        type: "display_alert",
        alert: notification,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(this.config.webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.webhook.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Webhook failed: ${response.status} ${response.statusText}`
        );
      }

      console.log(`Webhook notification sent for alert ${alert._id}`);

      // Mark notification as sent
      await alert.addNotification("webhook");
    } catch (error) {
      console.error("Error sending webhook notification:", error);
    }
  }

  private async sendSMSNotification(
    notification: AlertNotification,
    alert: AlertDocument
  ): Promise<void> {
    try {
      if (!this.config.sms?.recipients.length) {
        console.warn("No SMS recipients configured");
        return;
      }

      // Check cooldown
      if (!alert.shouldSendNotification("sms", 60)) {
        console.log(`SMS notification for alert ${alert._id} is in cooldown`);
        return;
      }

      const message = this.generateSMSMessage(notification);

      // Here you would integrate with your SMS service (Twilio, AWS SNS, etc.)
      console.log("Sending SMS notification:", {
        to: this.config.sms.recipients,
        message,
      });

      // For now, just log the SMS content
      // In a real implementation, you would use Twilio SDK or similar

      // Mark notification as sent
      await alert.addNotification("sms");
    } catch (error) {
      console.error("Error sending SMS notification:", error);
    }
  }

  private generateEmailBody(notification: AlertNotification): string {
    return `
      <h2>Display Alert: ${notification.title}</h2>
      
      <p><strong>Display:</strong> ${notification.displayName} (${
      notification.displayId
    })</p>
      <p><strong>Alert Type:</strong> ${notification.alertType}</p>
      <p><strong>Severity:</strong> ${notification.severity.toUpperCase()}</p>
      <p><strong>Time:</strong> ${notification.timestamp.toLocaleString()}</p>
      
      <h3>Description</h3>
      <p>${notification.message}</p>
      
      ${
        notification.metadata
          ? `
        <h3>Additional Information</h3>
        <pre>${JSON.stringify(notification.metadata, null, 2)}</pre>
      `
          : ""
      }
      
      <p>Please check the display monitoring dashboard for more details.</p>
    `;
  }

  private generateSMSMessage(notification: AlertNotification): string {
    return `ALERT: ${notification.displayName} - ${
      notification.title
    }. Severity: ${notification.severity.toUpperCase()}. Time: ${notification.timestamp.toLocaleTimeString()}`;
  }

  public async processUnsentNotifications(): Promise<void> {
    try {
      await dbConnect();

      // Get unacknowledged alerts that haven't been notified recently
      const alerts = await DisplayAlert.find({
        isActive: true,
        isAcknowledged: false,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      });

      for (const alert of alerts) {
        // Check if any notification type is due
        const shouldSendEmail =
          this.config.email?.enabled &&
          alert.shouldSendNotification("email", 30);
        const shouldSendWebhook =
          this.config.webhook?.enabled &&
          alert.shouldSendNotification("webhook", 5);
        const shouldSendSMS =
          this.config.sms?.enabled && alert.shouldSendNotification("sms", 60);

        if (shouldSendEmail || shouldSendWebhook || shouldSendSMS) {
          await this.sendAlertNotification(String(alert._id));
        }
      }
    } catch (error) {
      console.error("Error processing unsent notifications:", error);
    }
  }

  public async testNotification(
    type: "email" | "webhook" | "sms"
  ): Promise<boolean> {
    try {
      const testNotification: AlertNotification = {
        alertId: "test",
        displayId: "test-display",
        displayName: "Test Display",
        alertType: "offline",
        severity: "medium",
        title: "Test Notification",
        message:
          "This is a test notification to verify the notification system is working.",
        timestamp: new Date(),
      };

      const mockAlert = {
        shouldSendNotification: () => true,
        addNotification: async () => {},
      };

      switch (type) {
        case "email":
          await this.sendEmailNotification(testNotification, mockAlert);
          break;
        case "webhook":
          await this.sendWebhookNotification(testNotification, mockAlert);
          break;
        case "sms":
          await this.sendSMSNotification(testNotification, mockAlert);
          break;
      }

      return true;
    } catch (error) {
      console.error(`Error testing ${type} notification:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
