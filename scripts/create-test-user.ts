import mongoose from "mongoose";
import UserModel from "../api/models/User";

const MONGODB_URI =
  "mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/digital-signage?retryWrites=true&w=majority&appName=Cluster0";

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if test user already exists
    const existingUser = await UserModel.findOne({ email: "test@example.com" });
    if (existingUser) {
      console.log("Test user already exists:", existingUser.email);
      return;
    }

    // Create test user using passport-local-mongoose register method
    const testUser = new UserModel({
      email: "test@example.com",
      name: "Test User",
      role: "user",
    });

    // Register user with password (passport-local-mongoose handles hashing)
    const registeredUser = await UserModel.register(testUser, "test1234");
    console.log("Test user created successfully:", {
      id: registeredUser._id,
      email: registeredUser.email,
      name: registeredUser.name,
      role: registeredUser.role,
    });
  } catch (error) {
    console.error("Error creating test user:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

createTestUser();
