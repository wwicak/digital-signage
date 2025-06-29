import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";

// Define the response interface with proper typing
interface StatusResponse {
  authenticated: boolean;
  user?: {
    _id: string; // Change from any to string for MongoDB ObjectId
    email: string;
    name?: string;
    role?: string;
  };
  message?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    await dbConnect();

    // Try to get authenticated user
    const user = await requireAuth(request);

    if (user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          _id: user._id.toString(), // Convert ObjectId to string
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
  } catch (error: unknown) {
    // If requireAuth throws an error, user is not authenticated
    // Properly type the error handling
    console.error("Authentication check failed:", error);
    return NextResponse.json({
      authenticated: false,
      message: "User not authenticated",
    });
  }
}
