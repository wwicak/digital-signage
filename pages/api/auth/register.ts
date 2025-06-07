import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/mongodb";
import { registerUser, sanitizeUser } from "../../../api/helpers/auth_helper";
import User from "../../../api/models/User";
import { z } from "zod";

// Request body schema for registration
const RegisterRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").optional(),
});

type RegisterRequestBody = z.infer<typeof RegisterRequestSchema>;

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
    const validation = RegisterRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.errors,
      });
    }

    const { email, password, name } = validation.data;

    // Check if user already exists
    const existingUser = await User.findByUsername(email);
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Register user using helper function
    const registeredUser = await registerUser(email, password, name);

    // Return sanitized user data
    const userResponse = sanitizeUser(registeredUser);

    // TODO: Implement next-auth session management here
    // For now, we'll just return the user data without establishing a session
    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    // Handle specific passport-local-mongoose errors
    if (error.name === "UserExistsError") {
      return res.status(409).json({ message: "User already exists" });
    }

    if (error.name === "MissingPasswordError") {
      return res.status(400).json({ message: "Password is required" });
    }

    if (error.name === "MissingUsernameError") {
      return res.status(400).json({ message: "Email is required" });
    }

    res.status(500).json({
      message: "Error registering user",
      error: error.message,
    });
  }
}
