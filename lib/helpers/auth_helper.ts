import User, { IUser, IUserRole, UserRoleName } from "../models/User";
import mongoose from "mongoose";

// DEPRECATED: This is a placeholder authentication helper that has been replaced with JWT-based auth
// Use the functions from @/lib/auth instead

export interface AuthenticatedUser {
  _id: any;
  email: string;
  name?: string;
  role: IUserRole;
}

/**
 * @deprecated Use requireAuth from @/lib/auth instead
 * Placeholder authentication function - DEPRECATED
 */
export async function requireAuth(req: any): Promise<AuthenticatedUser> {
  console.warn("DEPRECATED: requireAuth from auth_helper.ts is deprecated. Use requireAuth from @/lib/auth instead.");
  // Temporary implementation for development/testing
  // TODO: Replace with next-auth integration in production

  console.log("[DEBUG] requireAuth called with headers:", {
    authorization: req.headers?.authorization ? "present" : "missing",
    cookie: req.headers?.cookie ? "present" : "missing",
    "x-user-id": req.headers?.["x-user-id"],
  });

  // Check for authorization header or session
  const authHeader = req.headers?.authorization;
  const userId =
    req.headers?.["x-user-id"] || req.query?.userId || req.body?.userId;
  const cookies = req.headers?.cookie;

  // Parse cookies to check for loggedIn status
  let isLoggedInViaCookie = false;
  if (cookies) {
    const cookieObj = cookies.split(";").reduce((acc: any, cookie: string) => {
      const [key, value] = cookie.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});
    isLoggedInViaCookie = cookieObj.loggedIn === "true";
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Extract user ID from token (simplified for development)
    const token = authHeader.substring(7);
    // In a real implementation, you would verify the JWT token here

    return {
      _id: token || "temp_user_id",
      email: "temp@example.com",
      name: "Temp User",
      role: {
        name: UserRoleName.VIEWER,
        associatedDisplayIds: [],
        associatedBuildingIds: [],
      },
    };
  }

  if (userId) {
    // Allow direct user ID for testing
    console.log("[DEBUG] Direct userId auth - returning user:", userId);
    return {
      _id: userId,
      email: "temp@example.com",
      name: "Temp User",
      role: {
        name: UserRoleName.VIEWER,
        associatedDisplayIds: [],
        associatedBuildingIds: [],
      },
    };
  }

  // Check cookie-based authentication
  if (isLoggedInViaCookie) {
    const adminUserId = "683ecc9948ffe97555dde0cc"; // Use string for now
    console.log("[DEBUG] Cookie auth - returning admin user:", adminUserId);
    return {
      _id: adminUserId,
      email: "admin@example.com",
      name: "Administrator",
      role: {
        name: UserRoleName.SUPER_ADMIN,
        associatedDisplayIds: [],
        associatedBuildingIds: [],
      },
    };
  }

  // For development, return the existing admin user if no auth provided
  // TODO: Remove this in production and throw authentication error
  const adminUserId = "683ecc9948ffe97555dde0cc"; // Use string for now
  console.log("[DEBUG] Default auth - returning admin user:", adminUserId);
  return {
    _id: adminUserId,
    email: "admin@example.com",
    name: "Administrator",
    role: {
      name: UserRoleName.SUPER_ADMIN,
      associatedDisplayIds: [],
      associatedBuildingIds: [],
    },
  };

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
 * @deprecated Use withAuth from @/lib/auth instead
 * Middleware to protect API routes - DEPRECATED
 */
export function withAuth(
  handler: (req: any, res: any, user: AuthenticatedUser) => Promise<void>
) {
  console.warn("DEPRECATED: withAuth from auth_helper.ts is deprecated. Use withAuth from @/lib/auth instead.");
  return async (req: any, res: any) => {
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
