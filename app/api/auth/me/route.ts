import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Try to get authenticated user
    const user = await getAuthenticatedUser(request);

    if (user) {
      return NextResponse.json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "User not authenticated",
      }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: "Authentication check failed",
    }, { status: 401 });
  }
}
