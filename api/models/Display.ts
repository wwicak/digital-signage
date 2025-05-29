import mongoose, { Document, Model, Schema } from 'mongoose';
import { IWidget } from './Widget'; // Assuming Widget.ts exists or will exist

export interface IDisplay extends Document {
  name: string;
  description: string;
  widgets: (mongoose.Types.ObjectId | IWidget)[]; // Array of Widget ObjectIds or populated Widgets
  creator_id: mongoose.Types.ObjectId; // Assuming this refers to a User ObjectId
  creation_date: Date;
  last_update: Date;
  layout: string; // e.g., 'spaced', 'compact'
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
      required: true
    },
    description: String,
    widgets: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Widget' // This should match the model name used for Widget
      }
    ],
    creator_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // This should match the model name used for User
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
    layout: {
      type: String,
      default: 'spaced' // Default to 'spaced' layout
    },
    statusBar: {
      enabled: { type: Boolean, default: true },
      color: String, // Optional color
      elements: [{ type: String }] // Array of strings representing status bar elements
    }
  },
  {
    timestamps: { createdAt: 'creation_date', updatedAt: 'last_update' } // Automatically manage creation_date and last_update
  }
);

// Pre-save middleware to update `last_update` field
DisplaySchema.pre('save', function(next) {
  if (this.isModified()) { // Check if any field is modified, not just specific ones
    this.last_update = new Date();
  }
  next();
});

const DisplayModel: Model<IDisplay> = mongoose.model<IDisplay>('Display', DisplaySchema);

export default DisplayModel;
