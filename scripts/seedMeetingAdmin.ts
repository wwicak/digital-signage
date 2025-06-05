import mongoose from "mongoose";
import User from "../api/models/User";
import Building from "../api/models/Building";
import Room from "../api/models/Room";

const MONGODB_URI =
  "mongodb+srv://dimastw:dya0gVD7m9xJNJpo@cluster0.jez3b.mongodb.net/digital-signage?retryWrites=true&w=majority&appName=Cluster0";

async function seedMeetingAdmin() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
    console.log("✅ Connected to MongoDB successfully");

    // Check if admin user already exists
    let adminUser = await User.findOne({ email: "admin@example.com" });

    if (!adminUser) {
      // Create admin user if it doesn't exist
      console.log("👤 Creating admin user...");
      const newAdminUser = new User({
        email: "admin@example.com",
        name: "Administrator",
        role: "admin",
      });

      adminUser = await new Promise<any>((resolve, reject) => {
        User.register(newAdminUser, "admin123", (err: any, user: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(user);
          }
        });
      });

      console.log("✅ Admin user created successfully!");
    } else {
      console.log("👤 Admin user already exists!");
    }

    // Seed sample buildings and rooms for meeting management
    console.log("🏢 Setting up sample buildings and rooms...");

    // Check if buildings already exist
    const existingBuildings = await Building.find();
    if (existingBuildings.length === 0) {
      // Create sample buildings
      const building1 = new Building({
        name: "Main Office Building",
        address: "123 Business District, City Center",
      });

      const building2 = new Building({
        name: "Innovation Hub",
        address: "456 Tech Park, Innovation Quarter",
      });

      await building1.save();
      await building2.save();

      console.log("✅ Sample buildings created!");

      // Create sample rooms
      const rooms = [
        {
          name: "Executive Conference Room",
          building_id: building1._id,
          capacity: 12,
          facilities: [
            "projector",
            "whiteboard",
            "video conferencing",
            "coffee machine",
          ],
        },
        {
          name: "Team Meeting Room A",
          building_id: building1._id,
          capacity: 8,
          facilities: ["projector", "whiteboard"],
        },
        {
          name: "Creative Workshop",
          building_id: building2._id,
          capacity: 15,
          facilities: ["smart board", "design tools", "wireless presentation"],
        },
        {
          name: "Tech Lab Meeting Room",
          building_id: building2._id,
          capacity: 6,
          facilities: ["multiple monitors", "development tools", "whiteboard"],
        },
      ];

      for (const roomData of rooms) {
        const room = new Room(roomData);
        await room.save();
      }

      console.log("✅ Sample rooms created!");
    } else {
      console.log("🏢 Buildings and rooms already exist!");
    }

    console.log("");
    console.log("🎯 Meeting Room Management Setup Complete!");
    console.log("📧 Admin Email: admin@example.com");
    console.log("🔑 Admin Password: admin123");
    console.log("");
    console.log("📝 Sample data includes:");
    console.log("   - 2 Buildings with different locations");
    console.log("   - 4 Meeting rooms with various capacities and facilities");
    console.log("");
    console.log(
      "🚀 You can now manage meeting room reservations through the admin panel!"
    );

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedMeetingAdmin();
