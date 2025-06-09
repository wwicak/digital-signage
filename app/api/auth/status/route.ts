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
      const response: StatusResponse = {
        authenticated: true,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role.name,
        },
      };
      return NextResponse.json(response);
    } else {
      const response: StatusResponse = {
        authenticated: false,
        message: "User not authenticated",
      };
      return NextResponse.json(response);
    }
  } catch (error: any) {
    // If requireAuth throws an error, user is not authenticated
    const response: StatusResponse = {
      authenticated: false,
      message: "User not authenticated",
    };
    return NextResponse.json(response);
  }
}
