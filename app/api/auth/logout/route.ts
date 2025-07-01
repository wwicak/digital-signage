import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // Clear the auth cookie by setting it to expire
    const response = NextResponse.json({
      message: "Logout successful",
    });

    // Clear the auth cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    // Type the error as unknown first, then safely access properties
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        message: "Error during logout",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET method for logout as well
  return POST(request);
}
