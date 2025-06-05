import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

export interface IBuilding extends Document {
  name: string;
  address: string;
  creation_date: Date;
  last_update: Date;
}

const BuildingSchema = new Schema<IBuilding>(
  {
    name: {
      type: String,
      required: [true, "Building name is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Building address is required"],
      trim: true,
    },
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
BuildingSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.last_update = new Date();
  }
  next();
});

const BuildingModel: Model<IBuilding> = mongoose.model<IBuilding>(
  "Building",
  BuildingSchema
);

// Zod schema for IBuilding
export const BuildingSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: z.string().min(1, { message: "Building name is required" }),
  address: z.string().min(1, { message: "Building address is required" }),
  creation_date: z.date().optional(), // Defaulted by Mongoose
  last_update: z.date().optional(), // Defaulted by Mongoose
  __v: z.number().optional(),
});

export default BuildingModel;
