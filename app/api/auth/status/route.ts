import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/helpers/auth_helper";

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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Try to get authenticated user
    const user = await requireAuth(request);

    if (user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } else {
      return NextResponse.json({
        authenticated: false,
        message: "User not authenticated",
      });
    }
  } catch (error: any) {
    // If requireAuth throws an error, user is not authenticated
    return NextResponse.json({
      authenticated: false,
      message: "User not authenticated",
    });
  }
}
