import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";
import { IWidget } from "./Widget"; // Assuming Widget.ts exists or will exist

export interface IDisplay extends Document {
  name: string;
  description: string;
  widgets: (mongoose.Types.ObjectId | IWidget)[]; // Array of Widget ObjectIds or populated Widgets
  creator_id: mongoose.Types.ObjectId; // Assuming this refers to a User ObjectId
  creation_date: Date;
  last_update: Date;
  layout: mongoose.Types.ObjectId | string; // Reference to Layout model or legacy string
  orientation: string; // e.g., 'landscape', 'portrait'
  location?: string; // Physical location of the display
  building?: string; // Building where the display is located
  statusBar: {
    enabled: boolean;
    color?: string;
    elements: string[]; // e.g., ['clock', 'weather', 'logo']
  };
  // Layout change tracking
  layoutChangeRequested?: boolean;
  layoutChangeTimestamp?: Date;
  // Settings for display configuration
  settings?: {
    volume?: number;
    brightness?: number;
    autoRestart?: boolean;
    maintenanceMode?: boolean;
    allowRemoteControl?: boolean;
    contentFiltering?: boolean;
    emergencyMessageEnabled?: boolean;
  };
  refreshInterval?: number; // In seconds
  // Dynamic properties (not stored in database)
  clientCount?: number;
  isOnline?: boolean;
}

const DisplaySchema = new Schema<IDisplay>(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    widgets: [
      {
        type: Schema.Types.ObjectId,
        ref: "Widget", // This should match the model name used for Widget
      },
    ],
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // This should match the model name used for User
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
    layout: {
      type: Schema.Types.Mixed, // Can be ObjectId (reference to Layout) or String (legacy)
      default: "spaced", // Default to 'spaced' layout for backward compatibility
    },
    orientation: {
      type: String,
      default: "landscape", // Default to 'landscape' orientation
    },
    location: {
      type: String,
      default: "Unknown Location",
    },
    building: {
      type: String,
      default: "Main Building",
    },
    statusBar: {
      enabled: { type: Boolean, default: true },
      color: String, // Optional color
      elements: [{ type: String }], // Array of strings representing status bar elements
    },
    layoutChangeRequested: {
      type: Boolean,
      default: false,
    },
    layoutChangeTimestamp: {
      type: Date,
    },
    settings: {
      volume: { type: Number, default: 70, min: 0, max: 100 },
      brightness: { type: Number, default: 100, min: 0, max: 100 },
      autoRestart: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
      allowRemoteControl: { type: Boolean, default: true },
      contentFiltering: { type: Boolean, default: true },
      emergencyMessageEnabled: { type: Boolean, default: false },
    },
    refreshInterval: {
      type: Number,
      default: 300, // 5 minutes default
      min: 30,
      max: 3600,
    },
  },
  {
    timestamps: { createdAt: "creation_date", updatedAt: "last_update" }, // Automatically manage creation_date and last_update
  }
);

// Pre-save middleware to update `last_update` field
DisplaySchema.pre("save", function (next) {
  if (this.isModified()) {
    // Check if any field is modified, not just specific ones
    this.last_update = new Date();
  }
  next();
});

const DisplayModel: Model<IDisplay> =
  (mongoose.models?.Display as Model<IDisplay>) ||
  mongoose.model<IDisplay>("Display", DisplaySchema);

// Zod schema for StatusBar
export const StatusBarSchemaZod = z.object({
  enabled: z.boolean().default(true),
  color: z.string().optional(),
  elements: z.array(z.string()).default([]), // Default to empty array
});

// Zod schema for IDisplay
export const DisplaySchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: z.string(),
  description: z.string().optional(), // Mongoose String type is optional by default unless 'required: true'
  // For widgets, allowing an array of ObjectIds or populated widget objects (hence z.any() for populated)
  widgets: z
    .array(z.union([z.instanceof(mongoose.Types.ObjectId), z.any()]))
    .default([]),
  creator_id: z.instanceof(mongoose.Types.ObjectId),
  creation_date: z.date().optional(), // Defaulted by Mongoose timestamps
  last_update: z.date().optional(), // Defaulted by Mongoose timestamps
  layout: z
    .union([z.string(), z.instanceof(mongoose.Types.ObjectId)])
    .default("spaced"),
  orientation: z.string().default("landscape"),
  location: z.string().optional(),
  building: z.string().optional(),
  statusBar: StatusBarSchemaZod.default({ enabled: true, elements: [] }), // Provide default for the object itself
  // Layout change tracking
  layoutChangeRequested: z.boolean().optional(),
  layoutChangeTimestamp: z.date().optional(),
  // Settings
  settings: z.object({
    volume: z.number().min(0).max(100).optional(),
    brightness: z.number().min(0).max(100).optional(),
    autoRestart: z.boolean().optional(),
    maintenanceMode: z.boolean().optional(),
    allowRemoteControl: z.boolean().optional(),
    contentFiltering: z.boolean().optional(),
    emergencyMessageEnabled: z.boolean().optional(),
  }).optional(),
  refreshInterval: z.number().min(30).max(3600).optional(),
  // Dynamic properties (calculated at runtime)
  clientCount: z.number().optional(),
  isOnline: z.boolean().optional(),
  __v: z.number().optional(),
});

export default DisplayModel;
