import type { NextApiRequest, NextApiResponse } from "next";
import User, { IUser } from "../models/User";

// TODO: Replace with next-auth integration
// This is a placeholder authentication helper that will be replaced with next-auth

export interface AuthenticatedUser {
  _id: any;
  email: string;
  name?: string;
  role?: string;
}

/**
 * Placeholder authentication function
 * TODO: Replace with next-auth getServerSession implementation
 */
export async function requireAuth(req: any): Promise<AuthenticatedUser> {
  // For now, we'll throw an error since session management is not implemented
  // This maintains the same interface as the existing requireAuth in other files

  throw new Error(
    "Authentication not yet implemented. Please implement next-auth integration."
  );

  // Future implementation with next-auth would look like:
  /*
  import { getServerSession } from "next-auth/next"
  import { authOptions } from "../../pages/api/auth/[...nextauth]"
  
  const session = await getServerSession(req, res, authOptions)
  
  if (!session || !session.user) {
    throw new Error('User not authenticated')
  }
  
  return {
    _id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
    role: session.user.role || 'user'
  }
  */
}

/**
 * Middleware to protect API routes
 * TODO: Replace with next-auth session validation
 */
export function withAuth(
  handler: (
    req: any,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>
) {
  return async (req: any, res: NextApiResponse) => {
    try {
      const user = await requireAuth(req);
      return await handler(req, res, user);
    } catch (error: any) {
      return res.status(401).json({
        message: error.message || "Authentication required",
      });
    }
  };
}

/**
 * Register a new user using passport-local-mongoose
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<IUser> {
  const userToRegister = new User({
    email: email,
    name: name,
  });

  return new Promise<IUser>((resolve, reject) => {
    User.register(userToRegister, password, (err: any, user?: IUser) => {
      if (err) {
        reject(err);
      } else if (!user) {
        reject(new Error("User registration failed, user object not returned"));
      } else {
        resolve(user);
      }
    });
  });
}

/**
 * Authenticate a user using passport-local-mongoose
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<IUser> {
  return new Promise<IUser>((resolve, reject) => {
    try {
      const authenticateFunction = (User as any).authenticate();
      authenticateFunction(
        email,
        password,
        (err: any, user?: IUser | false, options?: any) => {
          if (err) {
            reject(err);
          } else if (!user) {
            reject(new Error("Invalid credentials"));
          } else {
            resolve(user);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Sanitize user object for API responses
 */
export function sanitizeUser(user: IUser): AuthenticatedUser {
  return {
    _id: user._id,
    email: user.email!,
    name: user.name,
    role: user.role,
  };
}
