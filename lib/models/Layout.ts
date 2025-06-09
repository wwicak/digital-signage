import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

export interface ILayout extends Document {
  name: string;
  description?: string;
  orientation: "landscape" | "portrait";
  layoutType: "spaced" | "compact";
  widgets: Array<{
    type: string;
    x: number;
    y: number;
    w: number;
    h: number;
    data?: any;
  }>;
  statusBar: {
    enabled: boolean;
    color?: string;
    elements: string[];
  };
  isActive: boolean;
  isTemplate: boolean;
  creator_id: mongoose.Types.ObjectId;
  creation_date: Date;
  last_update: Date;
  // Grid configuration
  gridConfig: {
    cols: number;
    rows: number;
    margin: [number, number];
    rowHeight: number;
  };
  // Preview/thumbnail data
  thumbnail?: string;
  previewUrl?: string;
}

const LayoutSchema = new Schema<ILayout>(
  {
    name: {
      type: String,
      required: [true, "Layout name is required"],
      trim: true,
      maxlength: [100, "Layout name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    orientation: {
      type: String,
      enum: ["landscape", "portrait"],
      default: "landscape",
      required: true,
    },
    layoutType: {
      type: String,
      enum: ["spaced", "compact"],
      default: "spaced",
      required: true,
    },
    widgets: [
      {
        type: {
          type: String,
          required: true,
        },
        x: {
          type: Number,
          required: true,
          min: 0,
        },
        y: {
          type: Number,
          required: true,
          min: 0,
        },
        w: {
          type: Number,
          required: true,
          min: 1,
        },
        h: {
          type: Number,
          required: true,
          min: 1,
        },
        data: {
          type: Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    statusBar: {
      enabled: {
        type: Boolean,
        default: true,
      },
      color: {
        type: String,
        default: "#000000",
      },
      elements: [
        {
          type: String,
        },
      ],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isTemplate: {
      type: Boolean,
      default: true,
    },
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
    gridConfig: {
      cols: {
        type: Number,
        default: 16,
      },
      rows: {
        type: Number,
        default: 9,
      },
      margin: {
        type: [Number],
        default: [12, 12],
      },
      rowHeight: {
        type: Number,
        default: 60,
      },
    },
    thumbnail: {
      type: String,
    },
    previewUrl: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: "creation_date", updatedAt: "last_update" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
LayoutSchema.index({ creator_id: 1, isActive: 1 });
LayoutSchema.index({ isTemplate: 1, isActive: 1 });
LayoutSchema.index({ name: 1 });
LayoutSchema.index({ creation_date: -1 });

// Virtual for display count (layouts can be used by multiple displays)
LayoutSchema.virtual("displayCount", {
  ref: "Display",
  localField: "_id",
  foreignField: "layout",
  count: true,
});

// Pre-save middleware to update last_update
LayoutSchema.pre("save", function (next) {
  this.last_update = new Date();
  next();
});

// Zod schema for validation
export const LayoutSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: z
    .string()
    .min(1, "Layout name is required")
    .max(100, "Layout name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  layoutType: z.enum(["spaced", "compact"]).default("spaced"),
  widgets: z
    .array(
      z.object({
        type: z.string(),
        x: z.number().min(0),
        y: z.number().min(0),
        w: z.number().min(1),
        h: z.number().min(1),
        data: z.any().optional().default({}),
      })
    )
    .default([]),
  statusBar: z
    .object({
      enabled: z.boolean().default(true),
      color: z.string().optional().default("#000000"),
      elements: z.array(z.string()).default([]),
    })
    .default({ enabled: true, elements: [] }),
  isActive: z.boolean().default(true),
  isTemplate: z.boolean().default(true),
  creator_id: z.instanceof(mongoose.Types.ObjectId),
  creation_date: z.date().optional(),
  last_update: z.date().optional(),
  gridConfig: z
    .object({
      cols: z.number().default(16),
      rows: z.number().default(9),
      margin: z.array(z.number()).length(2).default([12, 12]),
      rowHeight: z.number().default(60),
    })
    .default({ cols: 16, rows: 9, margin: [12, 12], rowHeight: 60 }),
  thumbnail: z.string().optional(),
  previewUrl: z.string().optional(),
  displayCount: z.number().optional(),
  __v: z.number().optional(),
});

// Create and export the model
const LayoutModel: Model<ILayout> =
  mongoose.models.Layout || mongoose.model<ILayout>("Layout", LayoutSchema);

export default LayoutModel;
