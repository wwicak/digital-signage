import mongoose, { Document, Model, Schema } from "mongoose";

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
  url: string;
  alt?: string;
  caption?: string;
}

export interface VideoSlideData {
  url: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export interface WebSlideData {
  url: string;
  scale?: number;
  allowInteraction?: boolean;
}

export interface MarkdownSlideData {
  content: string;
  theme?: string;
}

export interface PhotoSlideData {
  url: string;
  caption?: string;
  effects?: string[];
}

export interface YoutubeSlideData {
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

const SlideModel: Model<ISlide> = mongoose.model<ISlide>("Slide", SlideSchema);

export default SlideModel;
