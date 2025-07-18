import mongoose, { Document, Model, Schema } from "mongoose";
import * as z from "zod";

import { IUser } from "./User";

import { IRoom } from "./Room";
import { decrypt } from "../helpers/crypto_helper";

export interface IUserCalendarLink extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  roomId?: mongoose.Types.ObjectId | IRoom; // New field
  provider: "google" | "outlook";
  externalUserId: string;
  calendarId: string;
  accessToken: string; // Stored encrypted
  refreshToken?: string; // Stored encrypted
  tokenExpiryDate?: Date;
  scopes: string[];
  isActive: boolean;
  lastSyncStatus?: "success" | "failed";
  lastSyncError?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  getDecryptedAccessToken(): string;
  getDecryptedRefreshToken(): string;
  isTokenExpired(): boolean;
}

const UserCalendarLinkSchema = new Schema<IUserCalendarLink>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      // index: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
    },
    provider: {
      type: String,
      enum: ["google", "outlook"],
      required: [true, "Provider is required"],
      // index: true,
    },
    externalUserId: {
      type: String,
      required: [true, "External user ID is required"],
      trim: true,
    },
    calendarId: {
      type: String,
      required: [true, "Calendar ID is required"],
      trim: true,
    },
    accessToken: {
      type: String,
      required: [true, "Access token is required"],
    },
    refreshToken: {
      type: String,
    },
    tokenExpiryDate: {
      type: Date,
    },
    scopes: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      // index: true,
    },
    lastSyncStatus: {
      type: String,
      enum: ["success", "failed"],
    },
    lastSyncError: {
      type: String,
      trim: true,
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to encrypt tokens


// Method to get decrypted access token
UserCalendarLinkSchema.methods.getDecryptedAccessToken = function (): string {
  if (!this.accessToken) return "";
  try {
    return decrypt(this.accessToken);
  } catch (error) {
    throw new Error(
      `Failed to decrypt access token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Method to get decrypted refresh token
UserCalendarLinkSchema.methods.getDecryptedRefreshToken = function (): string {
  if (!this.refreshToken) return "";
  try {
    return decrypt(this.refreshToken);
  } catch (error) {
    throw new Error(
      `Failed to decrypt refresh token: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

// Method to check if token is expired
UserCalendarLinkSchema.methods.isTokenExpired = function (): boolean {
  if (!this.tokenExpiryDate) return false;
  return new Date() >= this.tokenExpiryDate;
};

// Compound indexes for efficient querying
UserCalendarLinkSchema.index({ userId: 1, provider: 1 });
UserCalendarLinkSchema.index({ userId: 1, isActive: 1 });
UserCalendarLinkSchema.index({ provider: 1, externalUserId: 1 });

const UserCalendarLinkModel: Model<IUserCalendarLink> =
  (mongoose.models?.UserCalendarLink as Model<IUserCalendarLink>) ||
  mongoose.model<IUserCalendarLink>("UserCalendarLink", UserCalendarLinkSchema);

// Zod schema for IUserCalendarLink validation
export const UserCalendarLinkSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  userId: z.instanceof(mongoose.Types.ObjectId),
  roomId: z.instanceof(mongoose.Types.ObjectId),
  provider: z.enum(["google", "outlook"]),
  externalUserId: z
    .string()
    .min(1, { message: "External user ID is required" }),
  calendarId: z.string().min(1, { message: "Calendar ID is required" }),
  accessToken: z.string().min(1, { message: "Access token is required" }),
  refreshToken: z.string().optional(),
  tokenExpiryDate: z.date().optional(),
  scopes: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  lastSyncStatus: z.enum(["success", "failed"]).optional(),
  lastSyncError: z.string().optional(),
  lastSyncedAt: z.date().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  __v: z.number().optional(),
});

export default UserCalendarLinkModel;
