import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";
import { IRoom } from "./Room";

export interface IReservation extends Document {
  title: string;
  room_id: mongoose.Types.ObjectId | IRoom;
  start_time: Date;
  end_time: Date;
  organizer: string;
  attendees: string[];
  agenda_meeting: string;
  creation_date: Date;
  last_update: Date;
  // External calendar integration fields
  externalCalendarEventId?: string;
  externalCalendarId?: string;
  sourceCalendarType?: "google" | "outlook" | "internal";
  lastSyncedAt?: Date;
  isExternallyManaged?: boolean;
}

const ReservationSchema = new Schema<IReservation>(
  {
    title: {
      type: String,
      required: [true, "Reservation title is required"],
      trim: true,
    },
    room_id: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room reference is required"],
    },
    start_time: {
      type: Date,
      required: [true, "Start time is required"],
    },
    end_time: {
      type: Date,
      required: [true, "End time is required"],
    },
    organizer: {
      type: String,
      required: [true, "Organizer is required"],
      trim: true,
    },
    attendees: [
      {
        type: String,
        trim: true,
      },
    ],
    agenda_meeting: {
      type: String,
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
    // External calendar integration fields
    externalCalendarEventId: {
      type: String,
      trim: true,
    },
    externalCalendarId: {
      type: String,
      trim: true,
    },
    sourceCalendarType: {
      type: String,
      enum: ["google", "outlook", "internal"],
      default: "internal",
    },
    lastSyncedAt: {
      type: Date,
    },
    isExternallyManaged: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: "creation_date", updatedAt: "last_update" },
  }
);

// Validation middleware to ensure end_time is after start_time
ReservationSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.last_update = new Date();
  }

  // Validate that end_time is after start_time
  if (this.end_time <= this.start_time) {
    const error = new Error("End time must be after start time");
    return next(error);
  }

  next();
});

// Index for efficient querying by room and time
ReservationSchema.index({ room_id: 1, start_time: 1, end_time: 1 });

// Additional indexes for external calendar integration
ReservationSchema.index({ externalCalendarEventId: 1 });
ReservationSchema.index({ sourceCalendarType: 1, isExternallyManaged: 1 });

const ReservationModel: Model<IReservation> =
  (mongoose.models?.Reservation as Model<IReservation>) ||
  mongoose.model<IReservation>("Reservation", ReservationSchema);

// Zod schema for IReservation
export const ReservationSchemaZod = z
  .object({
    _id: z
      .union([
        z.instanceof(mongoose.Types.ObjectId),
        z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
          message: "Invalid ObjectId format",
        }),
      ])
      .optional()
      .transform((val) => {
        if (typeof val === "string") {
          return new mongoose.Types.ObjectId(val);
        }
        return val;
      }),
    title: z.string().min(1, { message: "Reservation title is required" }),
    room_id: z
      .union([
        z.instanceof(mongoose.Types.ObjectId),
        z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
          message: "Invalid ObjectId format",
        }),
      ])
      .transform((val) => {
        if (typeof val === "string") {
          return new mongoose.Types.ObjectId(val);
        }
        return val;
      }),
    start_time: z
      .union([z.date(), z.string()])
      .transform((val) => {
        if (typeof val === "string") {
          return new Date(val);
        }
        return val;
      }),
    end_time: z
      .union([z.date(), z.string()])
      .transform((val) => {
        if (typeof val === "string") {
          return new Date(val);
        }
        return val;
      }),
    organizer: z.string().min(1, { message: "Organizer is required" }),
    attendees: z.array(z.string()).default([]),
    agenda_meeting: z.string().optional(),
    creation_date: z
      .union([z.date(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "string") {
          return new Date(val);
        }
        return val;
      }), // Defaulted by Mongoose
    last_update: z
      .union([z.date(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "string") {
          return new Date(val);
        }
        return val;
      }), // Defaulted by Mongoose
    // External calendar integration fields
    externalCalendarEventId: z.string().optional(),
    externalCalendarId: z.string().optional(),
    sourceCalendarType: z
      .enum(["google", "outlook", "internal"])
      .default("internal"),
    lastSyncedAt: z
      .union([z.date(), z.string()])
      .optional()
      .transform((val) => {
        if (typeof val === "string") {
          return new Date(val);
        }
        return val;
      }),
    isExternallyManaged: z.boolean().default(false),
    __v: z.number().optional(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });

export default ReservationModel;
