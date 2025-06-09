/**
 * Script to clean up test displays from the database
 * This will remove displays that are not actually deployed
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

// Define schemas
const DisplaySchema = new mongoose.Schema({
  name: String,
  location: String,
  building: String,
  layout: mongoose.Schema.Types.Mixed,
  orientation: String,
  last_update: Date,
  creation_date: Date,
  creator_id: mongoose.Schema.Types.ObjectId,
  widgets: [mongoose.Schema.Types.ObjectId],
});

const DisplayHeartbeatSchema = new mongoose.Schema({
  displayId: mongoose.Schema.Types.ObjectId,
  timestamp: Date,
  responseTime: Number,
  ipAddress: String,
  userAgent: String,
});

const Display = mongoose.model("Display", DisplaySchema);
const DisplayHeartbeat = mongoose.model(
  "DisplayHeartbeat",
  DisplayHeartbeatSchema
);

async function cleanupTestDisplays() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/digital_signage";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Get all displays
    const displays = await Display.find({}).lean();
    console.log(`\nFound ${displays.length} displays in database:`);

    displays.forEach((display, index) => {
      console.log(
        `${index + 1}. ${display.name} (${display._id}) - ${
          display.location || "No location"
        }`
      );
    });

    // Ask user which displays to remove
    console.log("\n=== CLEANUP OPTIONS ===");
    console.log("1. Remove all test displays (recommended)");
    console.log("2. Remove specific displays by ID");
    console.log("3. Remove displays with no recent activity");
    console.log("4. Exit without changes");

    // For automation, let's remove displays that look like test data
    const testDisplays = displays.filter(
      (display) =>
        display.name.toLowerCase().includes("test") ||
        display.name === "Conference Room A Display" ||
        display.location === "Conference Room A" ||
        !display.creation_date ||
        !display.creator_id
    );

    if (testDisplays.length > 0) {
      console.log(`\nFound ${testDisplays.length} test displays to remove:`);
      testDisplays.forEach((display, index) => {
        console.log(`${index + 1}. ${display.name} (${display._id})`);
      });

      // Remove test displays
      const testDisplayIds = testDisplays.map((d) => d._id);

      // Remove heartbeats for these displays
      const heartbeatResult = await DisplayHeartbeat.deleteMany({
        displayId: { $in: testDisplayIds },
      });
      console.log(`Removed ${heartbeatResult.deletedCount} heartbeat records`);

      // Remove the displays
      const displayResult = await Display.deleteMany({
        _id: { $in: testDisplayIds },
      });
      console.log(`Removed ${displayResult.deletedCount} test displays`);

      console.log("\n✅ Cleanup completed successfully!");
      console.log("The heartbeat requests should stop now.");
    } else {
      console.log("\nNo test displays found to remove.");
    }

    // Show remaining displays
    const remainingDisplays = await Display.find({}).lean();
    console.log(`\nRemaining displays: ${remainingDisplays.length}`);
    remainingDisplays.forEach((display, index) => {
      console.log(`${index + 1}. ${display.name} (${display._id})`);
    });

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Alternative: Remove specific display by ID
async function removeDisplayById(displayId) {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/digital_signage";
    await mongoose.connect(mongoUri);

    // Remove heartbeats
    await DisplayHeartbeat.deleteMany({ displayId });

    // Remove display
    const result = await Display.findByIdAndDelete(displayId);

    if (result) {
      console.log(`✅ Removed display: ${result.name} (${displayId})`);
    } else {
      console.log(`❌ Display not found: ${displayId}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// CLI interface
const command = process.argv[2];
const displayId = process.argv[3];

if (command === "remove-id" && displayId) {
  removeDisplayById(displayId);
} else if (command === "cleanup") {
  cleanupTestDisplays();
} else {
  console.log("Usage:");
  console.log(
    "  node scripts/cleanup-test-displays.js cleanup          # Remove all test displays"
  );
  console.log(
    "  node scripts/cleanup-test-displays.js remove-id <id>   # Remove specific display"
  );
  console.log("");
  console.log("Example:");
  console.log(
    "  node scripts/cleanup-test-displays.js remove-id 6843efe39ad83fef90fec64c"
  );
}
