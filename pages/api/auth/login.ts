import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import {
  authenticateUser,
  sanitizeUser,
} from "../../../api/helpers/auth_helper";
import { z } from "zod";

// Request body schema for login
const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginRequestBody = z.infer<typeof LoginRequestSchema>;

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

    // Authenticate user using helper function
    const user = await authenticateUser(email, password);

    // Return sanitized user data
    const userResponse = sanitizeUser(user);

    // TODO: Implement next-auth session management here
    // For now, we'll just return the user data without establishing a session
    res.status(200).json({
      message: "Login successful",
      user: userResponse,
    });
  } catch (error: any) {
    console.error("Login error:", error);

    // Handle authentication errors
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.status(500).json({
      message: "Error during login",
      error: error.message,
    });
  }
}
