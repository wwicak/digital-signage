import mongoose, { Document, Model, Schema, FilterQuery } from "mongoose";
import * as z from "zod";

export interface IDisplayAlert extends Document {
  displayId: mongoose.Types.ObjectId;
  alertType:
    | "offline"
    | "connection_lost"
    | "performance_degraded"
    | "heartbeat_missed"
    | "custom";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  isActive: boolean;
  isAcknowledged: boolean;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  triggerConditions: {
    offlineThresholdMinutes?: number;
    missedHeartbeats?: number;
    responseTimeThresholdMs?: number;
    consecutiveFailures?: number;
  };
  metadata?: {
    lastSeen?: Date;
    responseTime?: number;
    errorDetails?: string;
    clientInfo?: {
      userAgent?: string;
      ip?: string;
      [key: string]: unknown;
    };
  };
  notificationsSent: {
    email?: Date[];
    webhook?: Date[];
    sms?: Date[];
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  shouldSendNotification(
    notificationType: "email" | "webhook" | "sms",
    cooldownMinutes?: number
  ): boolean;
  addNotification(notificationType: "email" | "webhook" | "sms"): Promise<IDisplayAlert>;
}

const DisplayAlertSchema = new Schema<IDisplayAlert>(
  {
    displayId: {
      type: Schema.Types.ObjectId,
      ref: "Display",
      required: true,
      // index: true,
    },
    alertType: {
      type: String,
      enum: [
        "offline",
        "connection_lost",
        "performance_degraded",
        "heartbeat_missed",
        "custom",
      ],
      required: true,
      // index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      // index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      // index: true,
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
      // index: true,
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledgedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    triggerConditions: {
      offlineThresholdMinutes: Number,
      missedHeartbeats: Number,
      responseTimeThresholdMs: Number,
      consecutiveFailures: Number,
    },
    metadata: {
      lastSeen: Date,
      responseTime: Number,
      errorDetails: String,
      clientInfo: Schema.Types.Mixed,
    },
    notificationsSent: {
      email: [Date],
      webhook: [Date],
      sms: [Date],
    },
  },
  {
    timestamps: true,
    collection: "display_alerts",
  }
);

// Indexes for efficient querying
DisplayAlertSchema.index({ displayId: 1, isActive: 1 });
DisplayAlertSchema.index({ alertType: 1, severity: 1 });
DisplayAlertSchema.index({ isActive: 1, isAcknowledged: 1 });
DisplayAlertSchema.index({ createdAt: -1 });

// Methods
DisplayAlertSchema.methods.acknowledge = function (userId: string) {
  this.isAcknowledged = true;
  this.acknowledgedBy = new mongoose.Types.ObjectId(userId);
  this.acknowledgedAt = new Date();

  return this.save();
};

DisplayAlertSchema.methods.resolve = function () {
  this.isActive = false;
  this.resolvedAt = new Date();

  return this.save();
};

DisplayAlertSchema.methods.addNotification = function (
  type: "email" | "webhook" | "sms"
) {
  if (!this.notificationsSent[type]) {
    this.notificationsSent[type] = [];
  }
  this.notificationsSent[type].push(new Date());

  return this.save();
};

DisplayAlertSchema.methods.shouldSendNotification = function (
  type: "email" | "webhook" | "sms",
  cooldownMinutes: number = 30
) {
  const notifications = this.notificationsSent[type] || [];
  if (notifications.length === 0) return true;

  const lastNotification = notifications[notifications.length - 1];
  const cooldownMs = cooldownMinutes * 60 * 1000;

  return Date.now() - lastNotification.getTime() > cooldownMs;
};

// Instance methods
DisplayAlertSchema.methods.shouldSendNotification = function (
  notificationType: "email" | "webhook" | "sms",
  cooldownMinutes: number = 30
): boolean {
  const notifications = this.notificationsSent[notificationType] || [];
  if (notifications.length === 0) return true;

  const lastNotification = notifications[notifications.length - 1];
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const timeSinceLastNotification = Date.now() - lastNotification.getTime();

  return timeSinceLastNotification >= cooldownMs;
};

DisplayAlertSchema.methods.addNotification = function (
  notificationType: "email" | "webhook" | "sms"
): Promise<IDisplayAlert> {
  if (!this.notificationsSent[notificationType]) {
    this.notificationsSent[notificationType] = [];
  }

  this.notificationsSent[notificationType].push(new Date());
  return this.save();
};

// Static methods
DisplayAlertSchema.statics.createOfflineAlert = function (
  displayId: string,
  offlineMinutes: number,
  metadata?: {
    lastSeen?: Date;
    responseTime?: number;
    errorDetails?: string;
    clientInfo?: {
      userAgent?: string;
      ip?: string;
      [key: string]: unknown;
    };
  }
) {
  return this.create({
    displayId: new mongoose.Types.ObjectId(displayId),
    alertType: "offline",
    severity:
      offlineMinutes > 30
        ? "critical"
        : offlineMinutes > 10
        ? "high"
        : "medium",
    title: "Display Offline",
    message: `Display has been offline for ${offlineMinutes} minutes`,
    triggerConditions: {
      offlineThresholdMinutes: offlineMinutes,
    },
    metadata,
  });
};

DisplayAlertSchema.statics.createPerformanceAlert = function (
  displayId: string,
  responseTime: number,
  threshold: number,
  metadata?: {
    lastSeen?: Date;
    responseTime?: number;
    errorDetails?: string;
    clientInfo?: {
      userAgent?: string;
      ip?: string;
      [key: string]: unknown;
    };
  }
) {
  return this.create({
    displayId: new mongoose.Types.ObjectId(displayId),
    alertType: "performance_degraded",
    severity: responseTime > threshold * 3 ? "high" : "medium",
    title: "Performance Degraded",
    message: `Display response time (${responseTime}ms) exceeds threshold (${threshold}ms)`,
    triggerConditions: {
      responseTimeThresholdMs: threshold,
    },
    metadata: {
      ...metadata,
      responseTime,
    },
  });
};

DisplayAlertSchema.statics.getActiveAlerts = function (displayId?: string) {
  const query: FilterQuery<IDisplayAlert> = { isActive: true };
  if (displayId) {
    query.displayId = new mongoose.Types.ObjectId(displayId);
  }

  return this.find(query)
    .populate("displayId", "name description")
    .populate("acknowledgedBy", "name email")
    .sort({ severity: 1, createdAt: -1 }); // Critical first, then by creation time
};

DisplayAlertSchema.statics.getUnacknowledgedAlerts = function (
  displayId?: string
) {
  const query: FilterQuery<IDisplayAlert> = { isActive: true, isAcknowledged: false };
  if (displayId) {
    query.displayId = new mongoose.Types.ObjectId(displayId);
  }

  return this.find(query)
    .populate("displayId", "name description")
    .sort({ severity: 1, createdAt: -1 });
};

DisplayAlertSchema.statics.resolveAlertsForDisplay = function (
  displayId: string,
  alertTypes?: string[]
) {
  const query: FilterQuery<IDisplayAlert> = {
    displayId: new mongoose.Types.ObjectId(displayId),
    isActive: true,
  };

  if (alertTypes && alertTypes.length > 0) {
    query.alertType = { $in: alertTypes };
  }

  return this.updateMany(query, {
    isActive: false,
    resolvedAt: new Date(),
  });
};

DisplayAlertSchema.statics.getAlertStats = function (periodDays: number = 30) {
  const cutoffTime = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: cutoffTime },
      },
    },
    {
      $group: {
        _id: {
          alertType: "$alertType",
          severity: "$severity",
        },
        count: { $sum: 1 },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $ne: ["$resolvedAt", null] },
              { $subtract: ["$resolvedAt", "$createdAt"] },
              null,
            ],
          },
        },
      },
    },
    {
      $sort: { "_id.severity": 1, "_id.alertType": 1 },
    },
  ]);
};

// Static methods interface
interface IDisplayAlertModel extends Model<IDisplayAlert> {
  createOfflineAlert(
    displayId: string,
    offlineMinutes: number,
    metadata?: {
      lastSeen?: Date;
      responseTime?: number;
      errorDetails?: string;
      clientInfo?: {
        userAgent?: string;
        ip?: string;
        [key: string]: unknown;
      };
    }
  ): Promise<IDisplayAlert>;
  createPerformanceAlert(
    displayId: string,
    responseTime: number,
    threshold: number,
    metadata?: {
      lastSeen?: Date;
      responseTime?: number;
      errorDetails?: string;
      clientInfo?: {
        userAgent?: string;
        ip?: string;
        [key: string]: unknown;
      };
    }
  ): Promise<IDisplayAlert>;
  getActiveAlerts(displayId?: string): mongoose.Query<IDisplayAlert[], IDisplayAlert>;
  getUnacknowledgedAlerts(displayId?: string): mongoose.Query<IDisplayAlert[], IDisplayAlert>;
  resolveAlertsForDisplay(displayId: string, alertTypes?: string[]): Promise<{ modifiedCount: number }>;
  getAlertStats(periodDays?: number): mongoose.Aggregate<unknown[]>;
}

const DisplayAlertModel: IDisplayAlertModel =
  (mongoose.models?.DisplayAlert as IDisplayAlertModel) ||
  mongoose.model<IDisplayAlert, IDisplayAlertModel>(
    "DisplayAlert",
    DisplayAlertSchema
  );

// Zod schema for validation
export const DisplayAlertSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  displayId: z.instanceof(mongoose.Types.ObjectId),
  alertType: z.enum([
    "offline",
    "connection_lost",
    "performance_degraded",
    "heartbeat_missed",
    "custom",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  title: z.string(),
  message: z.string(),
  isActive: z.boolean().default(true),
  isAcknowledged: z.boolean().default(false),
  acknowledgedBy: z.instanceof(mongoose.Types.ObjectId).optional(),
  acknowledgedAt: z.date().optional(),
  resolvedAt: z.date().optional(),
  triggerConditions: z
    .object({
      offlineThresholdMinutes: z.number().optional(),
      missedHeartbeats: z.number().optional(),
      responseTimeThresholdMs: z.number().optional(),
      consecutiveFailures: z.number().optional(),
    })
    .optional(),
  metadata: z.object({
    lastSeen: z.date().optional(),
    responseTime: z.number().optional(),
    errorDetails: z.string().optional(),
    clientInfo: z.object({
      userAgent: z.string().optional(),
      ip: z.string().optional(),
    }).catchall(z.unknown()).optional(),
  }).optional(),
  notificationsSent: z
    .object({
      email: z.array(z.date()).optional(),
      webhook: z.array(z.date()).optional(),
      sms: z.array(z.date()).optional(),
    })
    .optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  __v: z.number().optional(),
});

export default DisplayAlertModel;
