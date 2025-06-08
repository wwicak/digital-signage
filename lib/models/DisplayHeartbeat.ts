import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

export interface IDisplayHeartbeat extends Document {
  displayId: mongoose.Types.ObjectId;
  timestamp: Date;
  responseTime: number; // in milliseconds
  ipAddress?: string;
  userAgent?: string;
  connectionType: "sse" | "websocket" | "polling";
  clientInfo?: {
    screenResolution?: string;
    browserVersion?: string;
    platform?: string;
    memoryUsage?: number;
    cpuUsage?: number;
    networkType?: string;
  };
  serverInfo?: {
    serverTime: Date;
    processingTime: number;
    activeConnections: number;
  };
}

const DisplayHeartbeatSchema = new Schema<IDisplayHeartbeat>(
  {
    displayId: {
      type: Schema.Types.ObjectId,
      ref: "Display",
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    responseTime: {
      type: Number,
      required: true,
      min: 0,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    connectionType: {
      type: String,
      enum: ["sse", "websocket", "polling"],
      default: "sse",
    },
    clientInfo: {
      screenResolution: String,
      browserVersion: String,
      platform: String,
      memoryUsage: Number,
      cpuUsage: Number,
      networkType: String,
    },
    serverInfo: {
      serverTime: {
        type: Date,
        default: Date.now,
      },
      processingTime: {
        type: Number,
        min: 0,
      },
      activeConnections: {
        type: Number,
        min: 0,
      },
    },
  },
  {
    timestamps: false, // We use our own timestamp field
    collection: "display_heartbeats",
  }
);

// Indexes for efficient querying and automatic cleanup
DisplayHeartbeatSchema.index({ displayId: 1, timestamp: -1 });
DisplayHeartbeatSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
); // Auto-delete after 7 days

// Static methods
DisplayHeartbeatSchema.statics.recordHeartbeat = function (
  displayId: string,
  responseTime: number,
  clientInfo?: any,
  serverInfo?: any,
  connectionInfo?: {
    ipAddress?: string;
    userAgent?: string;
    connectionType?: string;
  }
) {
  return this.create({
    displayId: new mongoose.Types.ObjectId(displayId),
    timestamp: new Date(),
    responseTime,
    ipAddress: connectionInfo?.ipAddress,
    userAgent: connectionInfo?.userAgent,
    connectionType: connectionInfo?.connectionType || "sse",
    clientInfo,
    serverInfo: {
      ...serverInfo,
      serverTime: new Date(),
    },
  });
};

DisplayHeartbeatSchema.statics.getRecentHeartbeats = function (
  displayId: string,
  limitMinutes: number = 60
) {
  const cutoffTime = new Date(Date.now() - limitMinutes * 60 * 1000);

  return this.find({
    displayId: new mongoose.Types.ObjectId(displayId),
    timestamp: { $gte: cutoffTime },
  }).sort({ timestamp: -1 });
};

DisplayHeartbeatSchema.statics.getAverageResponseTime = function (
  displayId: string,
  periodMinutes: number = 60
) {
  const cutoffTime = new Date(Date.now() - periodMinutes * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        displayId: new mongoose.Types.ObjectId(displayId),
        timestamp: { $gte: cutoffTime },
      },
    },
    {
      $group: {
        _id: null,
        avgResponseTime: { $avg: "$responseTime" },
        minResponseTime: { $min: "$responseTime" },
        maxResponseTime: { $max: "$responseTime" },
        count: { $sum: 1 },
      },
    },
  ]);
};

DisplayHeartbeatSchema.statics.getHeartbeatStats = function (
  displayId: string,
  periodHours: number = 24
) {
  const cutoffTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        displayId: new mongoose.Types.ObjectId(displayId),
        timestamp: { $gte: cutoffTime },
      },
    },
    {
      $group: {
        _id: {
          hour: { $hour: "$timestamp" },
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        maxResponseTime: { $max: "$responseTime" },
        minResponseTime: { $min: "$responseTime" },
      },
    },
    {
      $sort: { "_id.date": 1, "_id.hour": 1 },
    },
  ]);
};

DisplayHeartbeatSchema.statics.cleanupOldHeartbeats = function (
  daysToKeep: number = 7
) {
  const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  return this.deleteMany({
    timestamp: { $lt: cutoffTime },
  });
};

// Static methods interface
interface IDisplayHeartbeatModel extends Model<IDisplayHeartbeat> {
  getRecentHeartbeats(displayId: string, limitMinutes?: number): any;
  getHeartbeatStats(displayId: string, periodHours?: number): any;
  cleanupOldHeartbeats(daysToKeep?: number): any;
}

const DisplayHeartbeatModel: IDisplayHeartbeatModel =
  (mongoose.models?.DisplayHeartbeat as IDisplayHeartbeatModel) ||
  mongoose.model<IDisplayHeartbeat, IDisplayHeartbeatModel>(
    "DisplayHeartbeat",
    DisplayHeartbeatSchema
  );

// Zod schema for validation
export const DisplayHeartbeatSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  displayId: z.instanceof(mongoose.Types.ObjectId),
  timestamp: z.date().default(() => new Date()),
  responseTime: z.number().min(0),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  connectionType: z.enum(["sse", "websocket", "polling"]).default("sse"),
  clientInfo: z
    .object({
      screenResolution: z.string().optional(),
      browserVersion: z.string().optional(),
      platform: z.string().optional(),
      memoryUsage: z.number().optional(),
      cpuUsage: z.number().optional(),
      networkType: z.string().optional(),
    })
    .optional(),
  serverInfo: z
    .object({
      serverTime: z.date().default(() => new Date()),
      processingTime: z.number().min(0).optional(),
      activeConnections: z.number().min(0).optional(),
    })
    .optional(),
});

export default DisplayHeartbeatModel;
