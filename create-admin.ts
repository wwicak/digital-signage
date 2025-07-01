import mongoose from "mongoose";
import User, { IUser, IUserRole, UserRoleName } from "./lib/models/User";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set!");
  console.error("Please set MONGODB_URI in your .env file");
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("✅ Connected to MongoDB successfully");

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: "admin@example.com" });

    if (existingAdmin) {
      console.log("👤 Admin user already exists!");
      console.log("Email: admin@example.com");
      console.log("You can login with this user");
      process.exit(0);
    }

    // Create admin user
    console.log("👤 Creating admin user...");
    const adminUser = new User({
      email: "admin@example.com",
      name: "Administrator",
      role: {
        name: UserRoleName.SUPER_ADMIN,
      } as IUserRole,
    });

    const registeredUser = await new Promise<IUser>((resolve, reject) => {
      User.register(adminUser, "admin123", (err: Error | null, user?: IUser) => { // Typed callback parameters
        if (err) {
          reject(err);
        } else if (user) {
          resolve(user);
        } else {
          reject(new Error("User registration failed: no user returned"));
        }
      });
    });

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email: admin@example.com");
    console.log("🔑 Password: admin123");
    console.log("");
    console.log(
      "🎯 You can now login to the admin panel with these credentials"
    );
    console.log("");
    console.log("💡 For meeting room management setup, run:");
    console.log("   npx ts-node scripts/seedMeetingAdmin.ts");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createAdmin();
