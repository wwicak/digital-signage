import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

export interface IDisplayStatus extends Document {
  displayId: mongoose.Types.ObjectId;
  isOnline: boolean;
  lastSeen: Date;
  lastHeartbeat: Date;
  clientCount: number;
  ipAddress?: string;
  userAgent?: string;
  connectionType: "sse" | "websocket" | "polling";
  disconnectionReason?:
    | "timeout"
    | "network_error"
    | "power_off"
    | "manual"
    | "unknown";
  consecutiveFailures: number;
  totalUptime: number; // in milliseconds
  totalDowntime: number; // in milliseconds
  // Performance metrics
  performance?: {
    cpuUsage?: number; // percentage
    memoryUsage?: number; // percentage
    diskUsage?: number; // percentage
    temperature?: number; // celsius
  };
  // Additional metadata
  metadata?: {
    resolution?: string; // e.g., "1920x1080"
    browser?: string; // e.g., "Chrome 96"
    appVersion?: string; // Application version
    screenSize?: string; // Physical screen size
  };
  createdAt: Date;
  updatedAt: Date;
}

const DisplayStatusSchema = new Schema<IDisplayStatus>(
  {
    displayId: {
      type: Schema.Types.ObjectId,
      ref: "Display",
      required: true,
      unique: true,
      // index: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
      // index: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      // index: true,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
    clientCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ipAddress: {
      type: String,
      sparse: true,
    },
    userAgent: {
      type: String,
    },
    connectionType: {
      type: String,
      enum: ["sse", "websocket", "polling"],
      default: "sse",
    },
    disconnectionReason: {
      type: String,
      enum: ["timeout", "network_error", "power_off", "manual", "unknown"],
      sparse: true,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalUptime: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDowntime: {
      type: Number,
      default: 0,
      min: 0,
    },
    performance: {
      cpuUsage: { type: Number, min: 0, max: 100 },
      memoryUsage: { type: Number, min: 0, max: 100 },
      diskUsage: { type: Number, min: 0, max: 100 },
      temperature: { type: Number },
    },
    metadata: {
      resolution: String,
      browser: String,
      appVersion: String,
      screenSize: String,
    },
  },
  {
    timestamps: true,
    collection: "display_statuses",
  }
);

// Indexes for efficient querying
DisplayStatusSchema.index({ displayId: 1, isOnline: 1 });
DisplayStatusSchema.index({ lastSeen: 1 });
DisplayStatusSchema.index({ isOnline: 1, lastSeen: 1 });

// Methods
DisplayStatusSchema.methods.markOnline = function (clientInfo?: {
  ipAddress?: string;
  userAgent?: string;
  connectionType?: string;
}) {
  const now = new Date();
  const wasOffline = !this.isOnline;

  if (wasOffline && this.lastSeen) {
    this.totalDowntime += now.getTime() - this.lastSeen.getTime();
  }

  this.isOnline = true;
  this.lastSeen = now;
  this.lastHeartbeat = now;
  this.consecutiveFailures = 0;
  this.disconnectionReason = undefined;

  if (clientInfo) {
    if (clientInfo.ipAddress) this.ipAddress = clientInfo.ipAddress;
    if (clientInfo.userAgent) this.userAgent = clientInfo.userAgent;
    if (clientInfo.connectionType)
      this.connectionType = clientInfo.connectionType as "sse" | "websocket" | "polling";
  }

  return this.save();
};

DisplayStatusSchema.methods.markOffline = function (reason?: string) {
  const now = new Date();
  const wasOnline = this.isOnline;

  if (wasOnline && this.lastSeen) {
    this.totalUptime += now.getTime() - this.lastSeen.getTime();
  }

  this.isOnline = false;
  this.lastSeen = now;
  this.clientCount = 0;
  this.consecutiveFailures += 1;
  this.disconnectionReason = reason || "unknown";

  return this.save();
};

DisplayStatusSchema.methods.updateHeartbeat = function () {
  this.lastHeartbeat = new Date();
  this.lastSeen = new Date();
  this.consecutiveFailures = 0;

  return this.save();
};

DisplayStatusSchema.methods.getUptimePercentage = function (periodMs?: number) {
  // If no period is specified, use total uptime
  if (!periodMs) {
    const total = this.totalUptime + this.totalDowntime;
    if (total === 0) return 100; // No data means 100% uptime
    return (this.totalUptime / total) * 100;
  }

  // Calculate uptime for the specified period
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodMs);
  
  // If the display was created after the period start, use its entire lifetime
  if (this.createdAt > periodStart) {
    const lifetimeMs = now.getTime() - this.createdAt.getTime();
    const uptime = this.isOnline ? lifetimeMs : Math.max(0, lifetimeMs - (now.getTime() - this.lastSeen.getTime()));
    return (uptime / lifetimeMs) * 100;
  }

  // For displays older than the period, calculate based on recent activity
  const recentDowntime = this.isOnline ? 0 : Math.min(periodMs, now.getTime() - this.lastSeen.getTime());
  const uptime = periodMs - recentDowntime;
  return (uptime / periodMs) * 100;
};

// Static methods
DisplayStatusSchema.statics.findByDisplayId = function (displayId: string) {
  return this.findOne({ displayId: new mongoose.Types.ObjectId(displayId) });
};

DisplayStatusSchema.statics.getOnlineDisplays = function () {
  return this.find({ isOnline: true }).populate("displayId");
};

DisplayStatusSchema.statics.getOfflineDisplays = function (
  timeoutMinutes: number = 5
) {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const cutoffTime = new Date(Date.now() - timeoutMs);

  return this.find({
    $or: [{ isOnline: false }, { lastHeartbeat: { $lt: cutoffTime } }],
  }).populate("displayId");
};

const DisplayStatusModel: Model<IDisplayStatus> =
  (mongoose.models?.DisplayStatus as Model<IDisplayStatus>) ||
  mongoose.model<IDisplayStatus>("DisplayStatus", DisplayStatusSchema);

// Zod schema for validation
export const DisplayStatusSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  displayId: z.instanceof(mongoose.Types.ObjectId),
  isOnline: z.boolean().default(false),
  lastSeen: z.date().default(() => new Date()),
  lastHeartbeat: z.date().default(() => new Date()),
  clientCount: z.number().min(0).default(0),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  connectionType: z.enum(["sse", "websocket", "polling"]).default("sse"),
  disconnectionReason: z
    .enum(["timeout", "network_error", "power_off", "manual", "unknown"])
    .optional(),
  consecutiveFailures: z.number().min(0).default(0),
  totalUptime: z.number().min(0).default(0),
  totalDowntime: z.number().min(0).default(0),
  performance: z.object({
    cpuUsage: z.number().min(0).max(100).optional(),
    memoryUsage: z.number().min(0).max(100).optional(),
    diskUsage: z.number().min(0).max(100).optional(),
    temperature: z.number().optional(),
  }).optional(),
  metadata: z.object({
    resolution: z.string().optional(),
    browser: z.string().optional(),
    appVersion: z.string().optional(),
    screenSize: z.string().optional(),
  }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  __v: z.number().optional(),
});

export default DisplayStatusModel;
