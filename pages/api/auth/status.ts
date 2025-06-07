import type { NextApiRequest, NextApiResponse } from "next/types";
import dbConnect from "../../../lib/mongodb";
import { getAuthenticatedUser } from "../../../lib/auth";

interface StatusResponse {
  authenticated: boolean;
  user?: {
    _id: any;
    email: string;
    name?: string;
    role?: string;
  };
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ authenticated: false, message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // Get authenticated user from request
    const user = await getAuthenticatedUser(req);

    if (user) {
      res.status(200).json({
        authenticated: true,
        user: user,
      });
    } else {
      res.status(200).json({
        authenticated: false,
        message: "User not authenticated",
      });
    }
  } catch (error: any) {
    console.error("Status check error:", error);

    res.status(500).json({
      authenticated: false,
      message: "Error checking authentication status",
    });
  }
}
