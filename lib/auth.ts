import type { NextApiRequest, NextApiResponse } from "next/types";
import { IncomingMessage } from "http";
import User, { IUser } from "./models/User";
import * as jwt from "jsonwebtoken";
import dbConnect from "./mongodb";

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  "fallback-secret-for-dev";

export interface AuthenticatedUser {
  _id: any;
  email: string;
  name?: string;
  role?: string;
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
      _id: user._id,
      email: user.email!,
      name: user.name,
      role: user.role || "user",
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
  req: NextApiRequest | IncomingMessage
): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookies = req.headers.cookie;
  if (cookies) {
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
  req: NextApiRequest
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
  req: NextApiRequest
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
    } catch (error: any) {
      return res.status(401).json({
        message: error.message || "Authentication required",
      });
    }
  };
}

/**
 * Set authentication cookie
 */
export function setAuthCookie(res: any, token: string) {
  res.setHeader(
    "Set-Cookie",
    `auth-token=${token}; HttpOnly; Path=/; Max-Age=${
      7 * 24 * 60 * 60
    }; SameSite=Strict${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(res: any) {
  res.setHeader(
    "Set-Cookie",
    `auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}
