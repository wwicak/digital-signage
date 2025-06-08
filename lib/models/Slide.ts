import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

// Define an enum for slide types
export enum SlideType {
  IMAGE = "image",
  VIDEO = "video",
  WEB = "web",
  MARKDOWN = "markdown",
  PHOTO = "photo",
  YOUTUBE = "youtube",
}

// Define specific data types for each slide type
export interface ImageSlideData {
  // Already exported, ensure all are
  url: string;
  alt?: string;
  caption?: string;
}

export interface VideoSlideData {
  // Ensure export
  url: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export interface WebSlideData {
  // Ensure export
  url: string;
  scale?: number;
  allowInteraction?: boolean;
}

export interface MarkdownSlideData {
  // Ensure export
  content: string;
  theme?: string;
}

export interface PhotoSlideData {
  // Ensure export
  url: string;
  caption?: string;
  effects?: string[];
}

export interface YoutubeSlideData {
  // Ensure export
  videoId: string;
  url: string;
  autoplay?: boolean;
  startTime?: number;
  endTime?: number;
}

// Union type for all slide data types
export type SlideData =
  | ImageSlideData
  | VideoSlideData
  | WebSlideData
  | MarkdownSlideData
  | PhotoSlideData
  | YoutubeSlideData;

export interface ISlide extends Document {
  name: string;
  description?: string;
  type: SlideType;
  data: SlideData;
  creator_id: mongoose.Types.ObjectId;
  creation_date: Date;
  last_update: Date;
  duration: number; // Duration in seconds for this slide
  is_enabled: boolean; // Whether this slide is active/enabled
}

const SlideSchema = new Schema<ISlide>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(SlideType),
    },
    data: {
      type: Schema.Types.Mixed, // Or a more specific schema based on 'type'
      required: true,
    },
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // Ensure 'User' matches your User model name
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
    duration: {
      type: Number,
      default: 10, // Default duration, e.g., 10 seconds
    },
    is_enabled: {
      type: Boolean,
      default: true,
    },
    // Define other fields from original schema here
  },
  {
    timestamps: { createdAt: "creation_date", updatedAt: "last_update" },
  }
);

// Pre-save middleware to update `last_update` field
SlideSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.last_update = new Date();
  }
  next();
});

const SlideModel: Model<ISlide> =
  (mongoose.models?.Slide as Model<ISlide>) ||
  mongoose.model<ISlide>("Slide", SlideSchema);

// Zod Schemas

// Enum for SlideType
export const SlideTypeZod = z.nativeEnum(SlideType);

// Schemas for SlideData variants
export const ImageSlideDataSchema = z.object({
  url: z.string().min(1), // Accept any non-empty string (relative or absolute URLs)
  alt: z.string().optional(),
  caption: z.string().optional(),
});

export const VideoSlideDataSchema = z.object({
  url: z.string().min(1), // Accept any non-empty string (relative or absolute URLs)
  autoplay: z.boolean().optional(),
  loop: z.boolean().optional(),
  muted: z.boolean().optional(),
});

export const WebSlideDataSchema = z.object({
  url: z.string().url(), // Keep strict URL validation for web content
  scale: z.number().optional(),
  allowInteraction: z.boolean().optional(),
});

export const MarkdownSlideDataSchema = z.object({
  content: z.string(),
  theme: z.string().optional(),
});

export const PhotoSlideDataSchema = z.object({
  url: z.string().min(1), // Accept any non-empty string (relative or absolute URLs)
  caption: z.string().optional(),
  effects: z.array(z.string()).optional(),
});

export const YoutubeSlideDataSchema = z.object({
  videoId: z.string(),
  url: z.string().url(), // Keep strict URL validation for YouTube URLs
  autoplay: z.boolean().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});

/*
 * Union schema for SlideData
 * This needs to be refined if we want to validate 'data' based on 'type' at this level.
 * For now, it validates that 'data' can be any of the defined slide data structures.
 */
export const SlideDataZod = z.union([
  ImageSlideDataSchema,
  VideoSlideDataSchema,
  WebSlideDataSchema,
  MarkdownSlideDataSchema,
  PhotoSlideDataSchema,
  YoutubeSlideDataSchema,
]);

// Zod schema for ISlide
export const SlideSchemaZod = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId).optional(),
    name: z.string(),
    description: z.string().optional(),
    type: SlideTypeZod,
    data: z.any(), // Changed from SlideDataZod to z.any() - superRefine will handle validation
    creator_id: z.instanceof(mongoose.Types.ObjectId),
    creation_date: z.date().optional(), // Defaulted by Mongoose
    last_update: z.date().optional(), // Defaulted by Mongoose
    duration: z.number().default(10),
    is_enabled: z.boolean().default(true),
    __v: z.number().optional(),
  })
  .superRefine((val, ctx) => {
    /*
     * Add discriminated union refinement here based on 'type' and 'data'
     * This ensures that the 'data' object matches the 'type' field.
     */
    switch (val.type) {
      case SlideType.IMAGE:
        if (!ImageSlideDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match IMAGE type schema",
          });
        }
        break;
      case SlideType.VIDEO:
        if (!VideoSlideDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match VIDEO type schema",
          });
        }
        break;
      case SlideType.WEB:
        if (!WebSlideDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match WEB type schema",
          });
        }
        break;
      case SlideType.MARKDOWN:
        if (!MarkdownSlideDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match MARKDOWN type schema",
          });
        }
        break;
      case SlideType.PHOTO:
        if (!PhotoSlideDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match PHOTO type schema",
          });
        }
        break;
      case SlideType.YOUTUBE:
        if (!YoutubeSlideDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match YOUTUBE type schema",
          });
        }
        break;
      default:
        // Should not happen if SlideTypeZod is exhaustive
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["type"],
          message: "Invalid slide type",
        });
    }
  });

export default SlideModel;
