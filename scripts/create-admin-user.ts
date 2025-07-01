import dbConnect from "@/lib/mongodb";
import User, { IUser, UserRoleName } from "@/lib/models/User";

async function createAdminUser() {
  try {
    await dbConnect();

    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const name = process.env.ADMIN_NAME || "Super Administrator";

    // Check if admin user already exists
    const existingUser = await User.findByUsername(email);
    if (existingUser) {
      console.log(`Admin user with email ${email} already exists.`);
      return;
    }

    // Create the admin user with SuperAdmin role
    const adminUser = new User({
      email,
      name,
      role: {
        name: UserRoleName.SUPER_ADMIN,
        associatedBuildingIds: [],
        associatedDisplayIds: [],
      },
    });

    // Register the user with password
    await new Promise<void>((resolve, reject) => {
      User.register(adminUser, password, (err: Error | null, user?: IUser) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Admin user created successfully:`);
          console.log(`Email: ${email}`);
          console.log(`Password: ${password}`);
          console.log(`Role: ${UserRoleName.SUPER_ADMIN}`);
          resolve();
        }
      });
    });

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createAdminUser();
}

export default createAdminUser;
