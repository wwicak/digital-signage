import mongoose, { Document, Model, Schema } from "mongoose";

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

// Pre-save middleware to update `last_update` field (already handled by timestamps, but can be kept if custom logic needed)
// WidgetSchema.pre('save', function(next) {
//   if (this.isModified()) {
//     this.last_update = new Date();
//   }
//   next();
// });

const WidgetModel: Model<IWidget> = mongoose.model<IWidget>(
  "Widget",
  WidgetSchema
);

export default WidgetModel;
