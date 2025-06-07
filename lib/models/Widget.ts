import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

// Define an enum for widget types if you have specific, known types
export enum WidgetType {
  ANNOUNCEMENT = "announcement",
  CONGRATS = "congrats",
  IMAGE = "image",
  LIST = "list",
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
  title?: string;
  url?: string;
  color?: string;
}

export interface ListWidgetData {
  title?: string;
  items?: string[];
  color?: string;
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

const WidgetModel: Model<IWidget> =
  (mongoose.models?.Widget as Model<IWidget>) ||
  mongoose.model<IWidget>("Widget", WidgetSchema);

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
  title: z.string().optional(),
  url: z.string().url().optional(),
  color: z.string().optional(),
});

export const ListWidgetDataSchema = z.object({
  title: z.string().optional(),
  items: z.array(z.string()).optional(),
  color: z.string().optional(),
});

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
