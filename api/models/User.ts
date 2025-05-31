import mongoose, { Schema, Model, Document } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
import passport from 'passport'; // Import for passport.Strategy
import * as z from 'zod';

// Interface for the User document instance
export interface IUser extends Document {
  name?: string;
  email?: string; // If using email as usernameField for PLM
  role?: string;
  username?: string; // If PLM uses 'username' (default)
}

// Interface for the User Model (statics) - Manually define PLM methods
export interface IUserModel extends Model<IUser> {
  createStrategy(): passport.Strategy; 
  serializeUser(): (user: IUser, done: (err: any, id?: any) => void) => void; 
  deserializeUser(): (id: any, done: (err: any, user?: IUser | false | null) => void) => void; 
  register(user: any, password_deprecated: string, cb?: (err: any, user?: IUser) => void): Promise<IUser>; 
  findByUsername(username: string, callback?: (err: any, user: IUser | null) => void): Promise<IUser | null>; 
  // Add other PLM static methods if you use them, e.g., authenticate()
  // authenticate(...args: any[]): any;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, unique: true }, // Ensure unique if used as usernameField
    role: { type: String, default: 'user' },
    // username: { type: String, trim: true, sparse: true }, // Only if username is a separate field
  },
  { timestamps: true }
);

UserSchema.plugin(passportLocalMongoose, {
  usernameField: 'email', // Using email as the username field for PLM
});

const UserModel = mongoose.model<IUser, IUserModel>('User', UserSchema);

// Zod schema for IUser
export const UserSchemaZod = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId).optional(),
  name: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional(), // passport-local-mongoose might enforce presence
  role: z.string().optional(),
  username: z.string().optional(), // Only if 'username' is distinct from 'email' and used
  // Timestamps from Mongoose { timestamps: true }
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  __v: z.number().optional(),
  // Note: Fields like 'hash' and 'salt' added by passport-local-mongoose are omitted
  // as they are typically not directly manipulated or validated in application logic.
});

export default UserModel;
