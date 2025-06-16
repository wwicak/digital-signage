import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

// Define an enum for widget types if you have specific, known types
export enum WidgetType {
  ANNOUNCEMENT = "announcement",
  CONGRATS = "congrats",
  IMAGE = "image",
  LIST = "list",
  MEDIA_PLAYER = "media-player",
  MEETING_ROOM = "meeting-room",
  SLIDESHOW = "slideshow", // Refers to a Slideshow model
  WEATHER = "weather",
  WEB = "web",
  YOUTUBE = "youtube",
  EMPTY = "empty", // For placeholder/empty widgets
}

// Define specific data types for each widget type
export interface AnnouncementWidgetData {
  title?: string;
  content?: string;
  color?: string;
  backgroundColor?: string;
}

export interface CongratsWidgetData {
  title?: string;
  content?: string;
  animation?: string;
  color?: string;
}

export interface ImageWidgetData {
  title?: string | null;
  url: string | null;  // Required but can be null
  fit: "contain" | "cover" | "fill" | "none" | "scale-down";  // Required
  color: string;  // Required
  altText?: string;  // Optional
}

export interface ListWidgetData {
  title?: string;
  items?: string[];
  color?: string;
}

export interface MediaPlayerWidgetData {
  title?: string;
  url?: string; // URL for uploaded file or remote media
  mediaType?: "video" | "audio";
  backgroundColor?: string;
  // Playback controls
  autoplay?: boolean;
  loop?: boolean;
  volume?: number; // 0-1
  muted?: boolean;
  showControls?: boolean;
  // Display options
  fit?: "contain" | "cover" | "fill";
  // Scheduling
  enableScheduling?: boolean;
  schedule?: {
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    timeSlots?: Array<{
      startTime: string; // HH:MM format
      endTime: string; // HH:MM format
    }>;
  };
  // Fallback content
  fallbackContent?: {
    message?: string;
    backgroundColor?: string;
  };
}

export interface SlideshowWidgetData {
  slideshow_id?: string;
  title?: string;
}

export interface WeatherWidgetData {
  title?: string;
  location?: string;
  units?: "metric" | "imperial";
  color?: string;
}

export interface WebWidgetData {
  title?: string | null;
  url: string;
  color?: string;
  refreshInterval?: number;
  scale?: number;
  allowInteraction?: boolean;
}

export interface YoutubeWidgetData {
  title?: string;
  url?: string;
  videoId?: string;
  color?: string;
}

export interface EmptyWidgetData {
  [key: string]: any;
}

// Union type for all widget data types
export type WidgetData =
  | AnnouncementWidgetData
  | CongratsWidgetData
  | ImageWidgetData
  | ListWidgetData
  | MediaPlayerWidgetData
  | SlideshowWidgetData
  | WeatherWidgetData
  | WebWidgetData
  | YoutubeWidgetData
  | EmptyWidgetData;

export interface IWidget extends Document {
  name: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  data: WidgetData; // Now using specific widget data types
  creator_id: mongoose.Types.ObjectId;
  creation_date: Date;
  last_update: Date;
  // Add any other fields from your original Widget.js schema
}

const WidgetSchema = new Schema<IWidget>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(WidgetType), // Use if WidgetType enum is defined
    },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    w: { type: Number, required: true, default: 1 },
    h: { type: Number, required: true, default: 1 },
    data: {
      type: Schema.Types.Mixed, // Or a more specific schema based on 'type'
      required: false, // Data might not be required for all widget types or at creation
    },
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // Ensure 'User' matches your User model name
      required: true,
    },
    // creation_date and last_update will be handled by timestamps
  },
  {
    timestamps: { createdAt: "creation_date", updatedAt: "last_update" },
  }
);

/*
 * Pre-save middleware to update `last_update` field (already handled by timestamps, but can be kept if custom logic needed)
 * WidgetSchema.pre('save', function(next) {
 *   if (this.isModified()) {
 *     this.last_update = new Date();
 *   }
 *   next();
 * });
 */

// Clear the cached model to ensure the updated schema is used
if (mongoose.models?.Widget) {
  delete mongoose.models.Widget;
}

// Debug: Log the enum values to verify they include media-player
//console.log("WidgetType enum values:", Object.values(WidgetType));

const WidgetModel: Model<IWidget> = mongoose.model<IWidget>(
  "Widget",
  WidgetSchema
);

// Zod Schemas

// Enum for WidgetType
export const WidgetTypeZod = z.nativeEnum(WidgetType);

// Schemas for WidgetData variants
export const AnnouncementWidgetDataSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export const CongratsWidgetDataSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  animation: z.string().optional(),
  color: z.string().optional(),
});

export const ImageWidgetDataSchema = z.object({
  title: z.string().nullable().optional(),
  url: z.string().url().nullable(),  // Required but can be null
  fit: z.enum(["contain", "cover", "fill", "none", "scale-down"]),  // Required
  color: z.string(),  // Required
  altText: z.string().optional(),
});

export const ListWidgetDataSchema = z.object({
  title: z.string().optional(),
  items: z.array(z.string()).optional(),
  color: z.string().optional(),
});

export const MediaPlayerWidgetDataSchema = z
  .object({
    title: z.string().optional(),
    url: z.string().optional(),
    mediaType: z.enum(["video", "audio"]).optional(),
    backgroundColor: z.string().optional(),
    // Playback controls
    autoplay: z.boolean().optional(),
    loop: z.boolean().optional(),
    volume: z.number().min(0).max(1).optional(),
    muted: z.boolean().optional(),
    showControls: z.boolean().optional(),
    // Display options
    fit: z.enum(["contain", "cover", "fill"]).optional(),
    // Scheduling
    enableScheduling: z.boolean().optional(),
    schedule: z
      .object({
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        timeSlots: z
          .array(
            z.object({
              startTime: z.string(), // Simplified - remove regex for now
              endTime: z.string(), // Simplified - remove regex for now
            })
          )
          .optional(),
      })
      .optional(),
    // Fallback content
    fallbackContent: z
      .object({
        message: z.string().optional(),
        backgroundColor: z.string().optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow additional properties

export const SlideshowWidgetDataSchema = z.object({
  slideshow_id: z.string().optional(), // Could be refined to ObjectId if always the case
  title: z.string().optional(),
});

export const WeatherWidgetDataSchema = z.object({
  title: z.string().optional(),
  location: z.string().optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  color: z.string().optional(),
});

export const WebWidgetDataSchema = z.object({
  title: z.string().nullish(),
  url: z.string().url(),
  color: z.string().optional(),
  refreshInterval: z.number().optional(),
  scale: z.number().optional(),
  allowInteraction: z.boolean().optional(),
});

export const YoutubeWidgetDataSchema = z.object({
  title: z.string().optional(),
  url: z.string().url().optional(),
  videoId: z.string().optional(),
  color: z.string().optional(),
});

export const EmptyWidgetDataSchema = z.record(z.any()).optional(); // Allows any structure for empty data

// Union schema for WidgetData
export const WidgetDataZod = z.union([
  AnnouncementWidgetDataSchema,
  CongratsWidgetDataSchema,
  ImageWidgetDataSchema,
  ListWidgetDataSchema,
  MediaPlayerWidgetDataSchema,
  SlideshowWidgetDataSchema,
  WeatherWidgetDataSchema,
  WebWidgetDataSchema,
  YoutubeWidgetDataSchema,
  EmptyWidgetDataSchema,
]);

// Zod schema for IWidget
export const WidgetSchemaZod = z
  .object({
    _id: z.instanceof(mongoose.Types.ObjectId).optional(),
    name: z.string(),
    type: WidgetTypeZod,
    x: z.number().default(0),
    y: z.number().default(0),
    w: z.number().default(1),
    h: z.number().default(1),
    data: WidgetDataZod.optional(), // Making data optional as per Mongoose schema
    creator_id: z.instanceof(mongoose.Types.ObjectId),
    creation_date: z.date().optional(), // Defaulted by Mongoose timestamps
    last_update: z.date().optional(), // Defaulted by Mongoose timestamps
    __v: z.number().optional(),
  })
  .superRefine((val, ctx) => {
    // Discriminated union refinement for 'data' based on 'type'
    if (val.data === undefined && val.type !== WidgetType.EMPTY) {
      // data can be optional
      /*
       * If data is optional, it might not need validation if not present,
       * unless certain types always require data.
       * For EMPTY, data can be missing.
       * Adjust this logic if data is strictly required for non-EMPTY types.
       */
      return;
    }

    switch (val.type) {
      case WidgetType.ANNOUNCEMENT:
        if (!AnnouncementWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match ANNOUNCEMENT type schema",
          });
        }
        break;
      case WidgetType.CONGRATS:
        if (!CongratsWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match CONGRATS type schema",
          });
        }
        break;
      case WidgetType.IMAGE:
        if (!ImageWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match IMAGE type schema",
          });
        }
        break;
      case WidgetType.LIST:
        if (!ListWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match LIST type schema",
          });
        }
        break;
      case WidgetType.MEDIA_PLAYER:
        const mediaPlayerResult = MediaPlayerWidgetDataSchema.safeParse(
          val.data
        );
        console.log("MediaPlayer Zod validation result:", mediaPlayerResult);
        if (!mediaPlayerResult.success) {
          console.error(
            "MediaPlayer Zod validation failed:",
            mediaPlayerResult.error
          );
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: `Data does not match MEDIA_PLAYER type schema: ${JSON.stringify(
              mediaPlayerResult.error.issues
            )}`,
          });
        }
        break;
      case WidgetType.SLIDESHOW:
        if (!SlideshowWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match SLIDESHOW type schema",
          });
        }
        break;
      case WidgetType.WEATHER:
        if (!WeatherWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match WEATHER type schema",
          });
        }
        break;
      case WidgetType.WEB:
        if (!WebWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match WEB type schema",
          });
        }
        break;
      case WidgetType.YOUTUBE:
        if (!YoutubeWidgetDataSchema.safeParse(val.data).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message: "Data does not match YOUTUBE type schema",
          });
        }
        break;
      case WidgetType.EMPTY:
        /*
         * EmptyWidgetDataSchema allows any structure or can be undefined.
         * If specific validation for EMPTY is needed, adjust here.
         */
        if (
          val.data !== undefined &&
          !EmptyWidgetDataSchema.safeParse(val.data).success
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["data"],
            message:
              "Data does not match EMPTY type schema (or should be undefined)",
          });
        }
        break;
      default:
        // This should ideally not be reached if WidgetTypeZod is exhaustive
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["type"],
          message: "Invalid widget type",
        });
    }
  });

export default WidgetModel;
