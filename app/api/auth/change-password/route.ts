import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAuth } from "@/lib/auth";
import User from "@/lib/models/User";
import { z } from "zod";

// Force dynamic rendering to prevent static generation errors
export const dynamic = "force-dynamic";

// Request body schema for password change
const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long")
    .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
    .regex(/[a-z]/, "New password must contain at least one lowercase letter")
    .regex(/\d/, "New password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "New password must contain at least one special character"
    ),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get authenticated user
    const user = await requireAuth(request);
    if (!user) {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ChangePasswordRequestSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.errors
        .map((err) => err.message)
        .join(". ");
      return NextResponse.json(
        { message: "Validation failed", errors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // Find the user in database
    const dbUser = await User.findById(user._id);
    if (!dbUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Verify current password using passport-local-mongoose
    try {
      const isValidPassword = await new Promise<boolean>((resolve, reject) => {
        // Use type assertion for passport-local-mongoose authenticate method
        const authenticateMethod = (dbUser as any).authenticate as (
          password: string,
          callback: (err: Error | null, user: unknown, passwordErr: Error | null) => void
        ) => void;
        
        authenticateMethod(
          currentPassword,
          (err: Error | null, user: unknown, passwordErr: Error | null) => {
            if (err) {
              reject(err);
            } else if (passwordErr) {
              resolve(false); // Password is incorrect
            } else if (user) {
              resolve(true); // Password is correct
            } else {
              resolve(false); // User not found or other issue
            }
          }
        );
      });

      if (!isValidPassword) {
        return NextResponse.json(
          { message: "Current password is incorrect" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Password verification error:", error);
      return NextResponse.json(
        { message: "Error verifying current password" },
        { status: 500 }
      );
    }

    // Change password using passport-local-mongoose
    try {
      await new Promise<void>((resolve, reject) => {
        // Use type assertion for passport-local-mongoose setPassword method
        const setPasswordMethod = (dbUser as any).setPassword as (
          password: string,
          callback: (err: Error | null) => void
        ) => void;
        
        setPasswordMethod(newPassword, (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Save the user with new password
      await dbUser.save();

      return NextResponse.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      console.error("Password change error:", error);
      return NextResponse.json(
        { message: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Change password error:", error);

    // Handle specific error types with proper type checking
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    
    if (errorMessage === "User not authenticated") {
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
