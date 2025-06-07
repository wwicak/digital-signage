import User, { IUser, IUserRole, UserRoleName } from "../models/User";

// TODO: Replace with next-auth integration
// This is a placeholder authentication helper that will be replaced with next-auth

export interface AuthenticatedUser {
  _id: any;
  email: string;
  name?: string;
  role: IUserRole;
}

/**
 * Placeholder authentication function
 * TODO: Replace with next-auth getServerSession implementation
 */
export async function requireAuth(req: any): Promise<AuthenticatedUser> {
  // Temporary implementation for development/testing
  // TODO: Replace with next-auth integration in production

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
  // Check cookie-based authentication
  if (isLoggedInViaCookie) {
    return {
      _id: "683ecc9948ffe97555dde0cc", // Use the actual admin user ID from MongoDB
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
  return {
    _id: "683ecc9948ffe97555dde0cc", // Use the actual admin user ID from MongoDB
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
 * Middleware to protect API routes
 * TODO: Replace with next-auth session validation
 */
export function withAuth(
  handler: (req: any, res: any, user: AuthenticatedUser) => Promise<void>
) {
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
