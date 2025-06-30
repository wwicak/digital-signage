import mongoose from "mongoose";
import User from "./lib/models/User";

const MONGODB_URI =
  "mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/digital-signage?retryWrites=true&w=majority&appName=Cluster0";

async function createAdmin() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
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
      role: "admin",
    });

    // Define user type based on User model
    interface RegisteredUser {
      _id: string;
      email: string;
      name: string;
      role: string;
    }
    
    const registeredUser = await new Promise<RegisteredUser>((resolve, reject) => {
      User.register(adminUser, "admin123", (err: Error | null, user: RegisteredUser) => { // Typed callback parameters
        if (err) {
          reject(err);
        } else {
          resolve(user);
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
