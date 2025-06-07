import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";
import { IBuilding } from "./Building";

export interface IRoom extends Document {
  name: string;
  building_id: mongoose.Types.ObjectId | IBuilding;
  capacity: number;
  facilities: string[];
  creation_date: Date;
  last_update: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },
    building_id: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: [true, "Building reference is required"],
    },
    capacity: {
      type: Number,
      required: [true, "Room capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    facilities: [
      {
        type: String,
        trim: true,
      },
    ],
    creation_date: {
      type: Date,
      default: Date.now,
    },
    last_update: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "creation_date", updatedAt: "last_update" },
  }
);

// Pre-save middleware to update `last_update` field
RoomSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.last_update = new Date();
  }
  next();
});

const RoomModel: Model<IRoom> = mongoose.model<IRoom>("Room", RoomSchema);

// Zod schema for IRoom
export const RoomSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: z.string().min(1, { message: "Room name is required" }),
  building_id: z.instanceof(mongoose.Types.ObjectId),
  capacity: z.number().min(1, { message: "Capacity must be at least 1" }),
  facilities: z.array(z.string()).default([]),
  creation_date: z.date().optional(), // Defaulted by Mongoose
  last_update: z.date().optional(), // Defaulted by Mongoose
  __v: z.number().optional(),
});

export default RoomModel;
