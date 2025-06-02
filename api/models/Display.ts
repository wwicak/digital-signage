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
  layout: string; // e.g., 'spaced', 'compact'
  orientation: string; // e.g., 'landscape', 'portrait'
  statusBar: {
    enabled: boolean;
    color?: string;
    elements: string[]; // e.g., ['clock', 'weather', 'logo']
  };
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
      type: String,
      default: "spaced", // Default to 'spaced' layout
    },
    orientation: {
      type: String,
      default: "landscape", // Default to 'landscape' orientation
    },
    statusBar: {
      enabled: { type: Boolean, default: true },
      color: String, // Optional color
      elements: [{ type: String }], // Array of strings representing status bar elements
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

const DisplayModel: Model<IDisplay> = mongoose.model<IDisplay>(
  "Display",
  DisplaySchema
);

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
  layout: z.string().default("spaced"),
  orientation: z.string().default("landscape"),
  statusBar: StatusBarSchemaZod.default({ enabled: true, elements: [] }), // Provide default for the object itself
  __v: z.number().optional(),
});

export default DisplayModel;
