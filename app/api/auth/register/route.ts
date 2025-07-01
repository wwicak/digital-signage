import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { registerUser, sanitizeUser } from "@/lib/helpers/auth_helper";
import { generateToken, setAuthCookie } from "@/lib/auth";
import User from "@/lib/models/User";
import { z } from "zod";

// Request body schema for registration
const RegisterRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").optional(),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    // Validate request body
    const validation = RegisterRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const existingUser = await User.findByUsername(email);
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 409 }
      );
    }

    // Register user using helper function
    const registeredUser = await registerUser(email, password, name);

    // Return sanitized user data
    const userResponse = sanitizeUser(registeredUser);

    // Generate JWT token and set cookie for immediate login
    const token = generateToken(registeredUser);

    const response = NextResponse.json(
      {
        message: "User registered successfully",
        user: userResponse,
      },
      { status: 201 }
    );

    // Set auth cookie
    setAuthCookie(response, token);

    return response;
  } catch (error: unknown) {
    console.error("Registration error:", error);

    // Handle specific passport-local-mongoose errors with proper type checking
    if (error && typeof error === 'object' && 'name' in error) {
      const typedError = error as { name: string; message?: string };
      
      if (typedError.name === "UserExistsError") {
        return NextResponse.json(
          { message: "User already exists" },
          { status: 409 }
        );
      }

      if (typedError.name === "MissingPasswordError") {
        return NextResponse.json(
          { message: "Password is required" },
          { status: 400 }
        );
      }

      if (typedError.name === "MissingUsernameError") {
        return NextResponse.json(
          { message: "Email is required" },
          { status: 400 }
        );
      }
    }

    // Extract error message safely
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        message: "Error registering user",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
