import type { NextApiRequest, NextApiResponse } from "next/types";
import type { NextRequest, NextResponse } from "next/server";
import { IncomingMessage } from "http";
import User, { IUser, IUserRole, UserRoleName } from "./models/User";
import * as jwt from "jsonwebtoken";
import dbConnect from "./mongodb";

// Cookie options interface
interface CookieOptions {
  httpOnly?: boolean;
  path?: string;
  maxAge?: number;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
}

// Type for response objects that can set cookies (both App Router and Pages Router)
type CookieResponse = 
  | NextResponse 
  | NextApiResponse 
  | { cookies: { set: (name: string, value: string, options?: CookieOptions) => void } }
  | { setHeader: (name: string, value: string) => void };

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  "fallback-secret-for-dev";

export interface AuthenticatedUser {
  _id: string; // MongoDB ObjectId as string for serialization
  email: string;
  name?: string;
  role: IUserRole;
}

export interface SessionData {
  user: AuthenticatedUser;
  exp: number;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(user: IUser): string {
  const payload: SessionData = {
    user: {
      _id: String(user._id), // Convert ObjectId to string
      email: user.email!,
      name: user.name,
      role: user.role || {
        name: UserRoleName.VIEWER,
        associatedDisplayIds: [],
        associatedBuildingIds: [],
      },
    },
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionData;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from request (from Authorization header or cookies)
 */
export function extractToken(
  req: NextApiRequest | NextRequest | IncomingMessage
): string | null {
  // Handle NextRequest (App Router)
  if ('cookies' in req && typeof req.cookies.get === 'function') {
    const nextReq = req as NextRequest;

    // Try Authorization header first
    const authHeader = nextReq.headers.get('authorization');
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Try cookie
    const authTokenCookie = nextReq.cookies.get('auth-token');
    if (authTokenCookie) {
      return authTokenCookie.value;
    }

    return null;
  }

  // Handle NextApiRequest and IncomingMessage (Pages Router)
  // Try Authorization header first
  const authHeader = 'authorization' in req.headers 
    ? req.headers.authorization 
    : undefined;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookies = 'cookie' in req.headers 
    ? req.headers.cookie 
    : undefined;
  if (cookies && typeof cookies === 'string') {
    const tokenMatch = cookies.match(/auth-token=([^;]+)/);
    if (tokenMatch) {
      return tokenMatch[1];
    }
  }

  return null;
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(
  req: NextApiRequest | NextRequest
): Promise<AuthenticatedUser | null> {
  await dbConnect();

  const token = extractToken(req);
  if (!token) {
    return null;
  }

  const sessionData = verifyToken(token);
  if (!sessionData) {
    return null;
  }

  // Check if token is expired
  if (sessionData.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  // Verify user still exists in database
  const user = await User.findById(sessionData.user._id);
  if (!user) {
    return null;
  }

  return sessionData.user;
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  req: NextApiRequest | NextRequest
): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}

/**
 * Middleware to protect API routes
 */
export function withAuth(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const user = await requireAuth(req);
      return await handler(req, res, user);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Authentication required";
      return res.status(401).json({
        message: errorMessage,
      });
    }
  };
}

/**
 * Set authentication cookie
 */
export function setAuthCookie(res: CookieResponse, token: string) {
  // Check if this is a NextResponse (App Router) or ServerResponse (Pages Router)
  if ('cookies' in res && res.cookies && typeof res.cookies.set === "function") {
    // App Router - use NextResponse.cookies.set()
    res.cookies.set("auth-token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  } else if ('setHeader' in res && res.setHeader && typeof res.setHeader === "function") {
    // Pages Router - use setHeader
    res.setHeader(
      "Set-Cookie",
      `auth-token=${token}; HttpOnly; Path=/; Max-Age=${
        7 * 24 * 60 * 60
      }; SameSite=Strict${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
  } else {
    throw new Error("Invalid response object for setting auth cookie");
  }
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(res: CookieResponse) {
  // Check if this is a NextResponse (App Router) or ServerResponse (Pages Router)
  if ('cookies' in res && res.cookies && typeof res.cookies.set === "function") {
    // App Router - use NextResponse.cookies.set()
    res.cookies.set("auth-token", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0, // Expire immediately
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  } else if ('setHeader' in res && res.setHeader && typeof res.setHeader === "function") {
    // Pages Router - use setHeader
    res.setHeader(
      "Set-Cookie",
      `auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );
  } else {
    throw new Error("Invalid response object for clearing auth cookie");
  }
}
