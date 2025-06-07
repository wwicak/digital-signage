iimport mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";
import { ISlide, SlideSchemaZod as ImportedSlideSchemaZod } from "./Slide"; // Import Zod schema for ISlide

export interface ISlideshow extends Document {
  name: string;
  description?: string;
  slides: (mongoose.Types.ObjectId | ISlide)[]; // Array of Slide ObjectIds or populated Slides
  creator_id: mongoose.Types.ObjectId;
  creation_date: Date;
  last_update: Date;
  is_enabled: boolean;
  // Add any other fields that were in your original Slideshow.js schema
}

const SlideshowSchema = new Schema<ISlideshow>(
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
    slides: [
      {
        type: Schema.Types.ObjectId,
        ref: "Slide", // This should match the model name used for Slide
      },
    ],
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
SlideshowSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.last_update = new Date();
  }
  next();
});

const SlideshowModel: Model<ISlideshow> =
  (mongoose.models.Slideshow as Model<ISlideshow>) ||
  mongoose.model<ISlideshow>("Slideshow", SlideshowSchema);

// Zod schema for ISlideshow
export const SlideshowSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: z.string(),
  description: z.string().optional(),
  slides: z
    .array(
      z.union([z.instanceof(mongoose.Types.ObjectId), ImportedSlideSchemaZod])
    )
    .default([]),
  creator_id: z.instanceof(mongoose.Types.ObjectId),
  creation_date: z.date().optional(), // Defaulted by Mongoose
  last_update: z.date().optional(), // Defaulted by Mongoose
  is_enabled: z.boolean().default(true),
  __v: z.number().optional(),
});

export default SlideshowModel;
