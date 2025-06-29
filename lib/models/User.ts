import mongoose, { Schema, Model, Document } from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";
import passport from "passport"; // Import for passport.Strategy
import * as z from "zod";

// Enum for Role Names
export enum UserRoleName {
  SUPER_ADMIN = "SuperAdmin",
  RESOURCE_MANAGER = "ResourceManager",
  DISPLAY_MANAGER = "DisplayManager",
  VIEWER = "Viewer",
}

// Interface for the role object
export interface IUserRole {
  name: UserRoleName;
  // Buildings this role is associated with (primarily for ResourceManager)
  associatedBuildingIds?: mongoose.Types.ObjectId[];
  // Displays this role is associated with (for ResourceManager, DisplayManager, Viewer)
  associatedDisplayIds?: mongoose.Types.ObjectId[];
}

// Interface for the User document instance
export interface IUser extends Document {
  name?: string;
  email?: string; // If using email as usernameField for PLM
  role: IUserRole; // Updated role structure
  username?: string; // If PLM uses 'username' (default)
}

// Interface for the User Model (statics) - Manually define PLM methods
export interface IUserModel extends Model<IUser> {
  createStrategy(): passport.Strategy;
  serializeUser(): (user: IUser, done: (err: Error | null, id?: string) => void) => void;
  deserializeUser(): (
    id: string,
    done: (err: Error | null, user?: IUser | false | null) => void
  ) => void;
  register(
    user: IUser | Record<string, unknown>,
    password_deprecated: string,
    cb?: (err: Error | null, user?: IUser) => void
  ): Promise<IUser>;
  findByUsername(
    username: string,
    callback?: (err: Error | null, user: IUser | null) => void
  ): Promise<IUser | null>;
  authenticate(): (
    username: string,
    password: string,
    cb: (err: Error | null, user?: IUser | false, options?: { message?: string }) => void
  ) => void;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, unique: true, required: true }, // Ensure unique if used as usernameField
    role: {
      name: {
        type: String,
        enum: Object.values(UserRoleName), // Use enum values
        default: UserRoleName.VIEWER, // Default to Viewer
        required: true,
      },
      associatedBuildingIds: [{ type: Schema.Types.ObjectId, ref: "Building" }],
      associatedDisplayIds: [{ type: Schema.Types.ObjectId, ref: "Display" }],
    },
    // username: { type: String, trim: true, sparse: true }, // Only if username is a separate field
  },
  { timestamps: true }
);

UserSchema.plugin(passportLocalMongoose, {
  usernameField: "email", // Using email as the username field for PLM
});

const UserModel =
  (mongoose.models?.User as IUserModel) ||
  mongoose.model<IUser, IUserModel>("User", UserSchema);

// Zod schema for IUserRole
export const UserRoleSchemaZod = z.object({
  name: z.nativeEnum(UserRoleName),
  associatedBuildingIds: z
    .array(z.instanceof(mongoose.Types.ObjectId))
    .optional(),
  associatedDisplayIds: z
    .array(z.instanceof(mongoose.Types.ObjectId))
    .optional(),
});

// Zod schema for IUser
export const UserSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }),
  role: UserRoleSchemaZod.default({
    name: UserRoleName.VIEWER,
    associatedDisplayIds: [],
    associatedBuildingIds: [],
  }),
  username: z.string().optional(), // Only if 'username' is distinct from 'email' and used
  // Timestamps from Mongoose { timestamps: true }
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  __v: z.number().optional(),
  /*
   * Note: Fields like 'hash' and 'salt' added by passport-local-mongoose are omitted
   * as they are typically not directly manipulated or validated in application logic.
   */
});

export default UserModel;
