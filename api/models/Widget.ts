import mongoose, { Document, Model, Schema } from 'mongoose';

// Define an enum for widget types if you have specific, known types
export enum WidgetType {
  ANNOUNCEMENT = 'announcement',
  CONGRATS = 'congrats',
  IMAGE = 'image',
  LIST = 'list',
  SLIDESHOW = 'slideshow', // Refers to a Slideshow model
  WEATHER = 'weather',
  WEB = 'web',
  YOUTUBE = 'youtube',
  EMPTY = 'empty', // For placeholder/empty widgets
}

export interface IWidget extends Document {
  name: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  data: any; // This can be more specific if widget types have defined data structures
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
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(WidgetType) // Use if WidgetType enum is defined
    },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    w: { type: Number, required: true, default: 1 },
    h: { type: Number, required: true, default: 1 },
    data: {
      type: Schema.Types.Mixed, // Or a more specific schema based on 'type'
      required: false // Data might not be required for all widget types or at creation
    },
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Ensure 'User' matches your User model name
      required: true
    }
    // creation_date and last_update will be handled by timestamps
  },
  {
    timestamps: { createdAt: 'creation_date', updatedAt: 'last_update' }
  }
);

// Pre-save middleware to update `last_update` field (already handled by timestamps, but can be kept if custom logic needed)
// WidgetSchema.pre('save', function(next) {
//   if (this.isModified()) {
//     this.last_update = new Date();
//   }
//   next();
// });

const WidgetModel: Model<IWidget> = mongoose.model<IWidget>('Widget', WidgetSchema);

export default WidgetModel;
