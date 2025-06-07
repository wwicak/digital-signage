import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { authenticateUser, sanitizeUser } from "@/lib/helpers/auth_helper";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

// Request body schema for login
const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    // Validate request body
    const validation = LoginRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Authenticate user using helper function
    const user = await authenticateUser(email, password);

    // Return sanitized user data
    const userResponse = sanitizeUser(user);

    // Generate JWT token and set cookie
    const token = generateToken(user);

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: userResponse,
      token: token, // Also return token for client-side storage if needed
    });

    // Set auth cookie
    setAuthCookie(response, token);

    return response;
  } catch (error: any) {
    console.error("Login error:", error);

    // Handle authentication errors
    if (error.message === "Invalid credentials") {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        message: "Error during login",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
