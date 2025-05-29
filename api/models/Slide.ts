import mongoose, { Document, Model, Schema } from 'mongoose';

// Define an enum for slide types if you have specific, known types
// export enum SlideType {
//   IMAGE = 'image',
//   VIDEO = 'video',
//   WEB_CONTENT = 'web_content',
//   CUSTOM = 'custom',
// }

export interface ISlide extends Document {
  name: string;
  description?: string;
  type: string; // Consider using an enum like SlideType if applicable
  data: any; // This can be more specific if slide types have defined data structures
  creator_id: mongoose.Types.ObjectId;
  creation_date: Date;
  last_update: Date;
  duration: number; // Duration in seconds for this slide
  is_enabled: boolean; // Whether this slide is active/enabled
  // Add any other fields that were in your original Slide.js schema
}

const SlideSchema = new Schema<ISlide>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      required: true
      // enum: Object.values(SlideType) // Use if SlideType enum is defined
    },
    data: {
      type: Schema.Types.Mixed, // Or a more specific schema based on 'type'
      required: true
    },
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Ensure 'User' matches your User model name
      required: true
    },
    creation_date: {
      type: Date,
      default: Date.now
    },
    last_update: {
      type: Date,
      default: Date.now
    },
    duration: {
      type: Number,
      default: 10 // Default duration, e.g., 10 seconds
    },
    is_enabled: {
      type: Boolean,
      default: true
    }
    // Define other fields from original schema here
  },
  {
    timestamps: { createdAt: 'creation_date', updatedAt: 'last_update' }
  }
);

// Pre-save middleware to update `last_update` field
SlideSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.last_update = new Date();
  }
  next();
});

const SlideModel: Model<ISlide> = mongoose.model<ISlide>('Slide', SlideSchema);

export default SlideModel;
