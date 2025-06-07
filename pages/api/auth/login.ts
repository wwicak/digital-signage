import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import User, { IUser } from "../../../api/models/User";
import { z } from "zod";

// Request body schema for login
const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginRequestBody = z.infer<typeof LoginRequestSchema>;

interface LoginResponse {
  message: string;
  user?: {
    _id: any;
    email: string;
    name?: string;
    role?: string;
  };
  errors?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // Validate request body
    const validation = LoginRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const { email, password } = validation.data;

    // Find user by email
    const user = await User.findByUsername(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Authenticate user using passport-local-mongoose's authenticate method
    const authResult = await new Promise<{ user?: IUser; error?: any }>(
      (resolve) => {
        // Use the authenticate method from passport-local-mongoose
        User.authenticate()(
          email,
          password,
          (err: any, authenticatedUser?: IUser | false, options?: any) => {
            if (err) {
              resolve({ error: err });
            } else if (!authenticatedUser) {
              resolve({ error: { message: "Invalid credentials" } });
            } else {
              resolve({ user: authenticatedUser });
            }
          }
        );
      }
    );

    if (authResult.error || !authResult.user) {
      return res.status(401).json({
        message: authResult.error?.message || "Invalid credentials",
      });
    }

    // Return sanitized user data
    const userResponse = {
      _id: authResult.user._id,
      email: authResult.user.email,
      name: authResult.user.name,
      role: authResult.user.role,
    };

    // TODO: Implement next-auth session management here
    // For now, we'll just return the user data without establishing a session
    res.status(200).json({
      message: "Login successful",
      user: userResponse,
    });
  } catch (error: any) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Error during login",
      error: error.message,
    });
  }
}
