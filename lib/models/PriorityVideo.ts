import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

export interface IPriorityVideo extends Document {
  title?: string;
  url: string;
  mediaType: "video" | "audio";
  backgroundColor: string;
  schedule: {
    daysOfWeek: number[];
    timeSlots: Array<{
      startTime: string;
      endTime: string;
    }>;
  };
  volume: number;
  fallbackContent: {
    message: string;
    backgroundColor: string;
  };
  priority: number;
  playOnce: boolean;
  displays?: mongoose.Types.ObjectId[]; // Array of Display ObjectIds this video applies to
  buildings?: string[]; // Array of building names this video applies to
  creator_id: mongoose.Types.ObjectId;
  creation_date: Date;
  last_update: Date;
  isActive: boolean;
}

const PriorityVideoSchema = new Schema<IPriorityVideo>(
  {
    title: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ["video", "audio"],
      default: "video",
    },
    backgroundColor: {
      type: String,
      default: "#000000",
    },
    schedule: {
      daysOfWeek: [{ type: Number }],
      timeSlots: [{
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      }],
    },
    volume: {
      type: Number,
      default: 1,
      min: 0,
      max: 1,
    },
    fallbackContent: {
      message: { type: String, default: "Priority video is not scheduled" },
      backgroundColor: { type: String, default: "#000000" },
    },
    priority: {
      type: Number,
      default: 100,
      min: 1,
      max: 999,
    },
    playOnce: {
      type: Boolean,
      default: true,
    },
    displays: [{
      type: Schema.Types.ObjectId,
      ref: "Display",
    }],
    buildings: [{ type: String }],
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creation_date: {
      type: Date,
      default: Date.now,
    },
    last_update: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "creation_date", updatedAt: "last_update" },
  }
);

// Pre-save middleware to update `last_update` field
PriorityVideoSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.last_update = new Date();
  }
  next();
});

const PriorityVideoModel: Model<IPriorityVideo> =
  (mongoose.models?.PriorityVideo as Model<IPriorityVideo>) ||
  mongoose.model<IPriorityVideo>("PriorityVideo", PriorityVideoSchema);

// Zod schema for time slot
export const TimeSlotSchemaZod = z.object({
  startTime: z.string(),
  endTime: z.string(),
});

// Zod schema for schedule
export const ScheduleSchemaZod = z.object({
  daysOfWeek: z.array(z.number()).default([]),
  timeSlots: z.array(TimeSlotSchemaZod).default([]),
});

// Zod schema for fallback content
export const FallbackContentSchemaZod = z.object({
  message: z.string().default("Priority video is not scheduled"),
  backgroundColor: z.string().default("#000000"),
});

// Zod schema for IPriorityVideo
export const PriorityVideoSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  title: z.string().optional(),
  url: z.string(),
  mediaType: z.enum(["video", "audio"]).default("video"),
  backgroundColor: z.string().default("#000000"),
  schedule: ScheduleSchemaZod,
  volume: z.number().min(0).max(1).default(1),
  fallbackContent: FallbackContentSchemaZod,
  priority: z.number().min(1).max(999).default(100),
  playOnce: z.boolean().default(true),
  displays: z.array(z.instanceof(mongoose.Types.ObjectId)).optional(),
  buildings: z.array(z.string()).optional(),
  creator_id: z.instanceof(mongoose.Types.ObjectId),
  creation_date: z.date().optional(),
  last_update: z.date().optional(),
  isActive: z.boolean().default(true),
  __v: z.number().optional(),
});

export default PriorityVideoModel;