/**
 * Script to initialize default feature flags
 * Run this script after setting up the database to create default feature flags
 */

import dbConnect from "../lib/mongodb";
import { initializeDefaultFeatureFlags } from "../lib/helpers/feature_flag_helper";
import User, { UserRoleName } from "../lib/models/User";

async function initFeatureFlags() {
  try {
    console.log("Connecting to database...");
    await dbConnect();

    // Find a super admin user to use as the creator
    const superAdmin = await User.findOne({ "role.name": UserRoleName.SUPER_ADMIN });
    
    if (!superAdmin) {
      console.error("No super admin user found. Please create a super admin user first.");
      process.exit(1);
    }

    console.log(`Initializing feature flags with creator: ${superAdmin.email}`);
    
    await initializeDefaultFeatureFlags(superAdmin._id.toString());
    
    console.log("✅ Feature flags initialized successfully!");
    console.log("\nDefault feature flags created:");
    console.log("📋 Menu Items:");
    console.log("  - Dashboard Menu");
    console.log("  - Screens Menu");
    console.log("  - Layout Menu");
    console.log("  - Preview Menu");
    console.log("  - Slideshows Menu");
    console.log("  - Buildings Menu");
    console.log("  - Meeting Rooms Menu");
    console.log("  - Reservations Menu");
    console.log("  - Calendar Sync Menu");
    console.log("  - Users Menu");
    
    console.log("\n🧩 Widgets:");
    console.log("  - Meeting Room Widget");
    console.log("  - Announcement Widget");
    console.log("  - Congratulations Widget");
    console.log("  - Image Widget");
    console.log("  - List Widget");
    console.log("  - Slideshow Widget");
    console.log("  - Weather Widget");
    console.log("  - Web Widget");
    console.log("  - YouTube Widget");
    
    console.log("\n⭐ Features:");
    console.log("  - Meeting Rooms Feature");
    console.log("  - Calendar Sync Feature");
    console.log("  - User Management Feature");
    
    console.log("\n🎯 All feature flags are enabled by default.");
    console.log("🔧 You can manage them through the admin interface at /feature-flags");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing feature flags:", error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  initFeatureFlags();
}

export { initFeatureFlags };
