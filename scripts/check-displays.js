/**
 * Script to check what displays exist in the database
 * This will help us understand why heartbeat requests are being made
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

// Define schemas directly since we can't import ES modules easily
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
  connectionType: String,
  clientInfo: mongoose.Schema.Types.Mixed,
  serverInfo: mongoose.Schema.Types.Mixed,
});

const Display = mongoose.model("Display", DisplaySchema);
const DisplayHeartbeat = mongoose.model(
  "DisplayHeartbeat",
  DisplayHeartbeatSchema
);

async function checkDisplays() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/digital_signage";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Get all displays
    const displays = await Display.find({}).lean();
    console.log("\n=== DISPLAYS IN DATABASE ===");
    console.log(`Total displays: ${displays.length}`);

    if (displays.length > 0) {
      displays.forEach((display, index) => {
        console.log(`\nDisplay ${index + 1}:`);
        console.log(`  ID: ${display._id}`);
        console.log(`  Name: ${display.name}`);
        console.log(`  Location: ${display.location || "N/A"}`);
        console.log(`  Building: ${display.building || "N/A"}`);
        console.log(`  Layout: ${display.layout}`);
        console.log(`  Orientation: ${display.orientation}`);
        console.log(`  Last Update: ${display.last_update || "Never"}`);
        console.log(`  Created: ${display.creation_date}`);
        console.log(`  Creator ID: ${display.creator_id}`);
        console.log(`  Widgets: ${display.widgets?.length || 0} widgets`);
      });
    }

    // Get recent heartbeats
    const recentHeartbeats = await DisplayHeartbeat.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    console.log("\n=== RECENT HEARTBEATS ===");
    console.log(`Total recent heartbeats: ${recentHeartbeats.length}`);

    if (recentHeartbeats.length > 0) {
      recentHeartbeats.forEach((heartbeat, index) => {
        console.log(`\nHeartbeat ${index + 1}:`);
        console.log(`  Display ID: ${heartbeat.displayId}`);
        console.log(`  Timestamp: ${heartbeat.timestamp}`);
        console.log(`  IP Address: ${heartbeat.ipAddress}`);
        console.log(`  Response Time: ${heartbeat.responseTime}ms`);
        console.log(
          `  User Agent: ${heartbeat.userAgent?.substring(0, 50)}...`
        );
      });
    }

    // Check for heartbeats from the specific display ID in the logs
    const specificDisplayId = "6843efe39ad83fef90fec64c";
    const specificDisplay = await Display.findById(specificDisplayId);

    console.log(`\n=== SPECIFIC DISPLAY (${specificDisplayId}) ===`);
    if (specificDisplay) {
      console.log("Display found:");
      console.log(`  Name: ${specificDisplay.name}`);
      console.log(`  Location: ${specificDisplay.location || "N/A"}`);
      console.log(`  Last Update: ${specificDisplay.last_update || "Never"}`);
      console.log(`  Created: ${specificDisplay.creation_date}`);

      // Get heartbeats for this specific display
      const specificHeartbeats = await DisplayHeartbeat.find({
        displayId: specificDisplayId,
      })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

      console.log(`  Recent heartbeats: ${specificHeartbeats.length}`);
      specificHeartbeats.forEach((hb, i) => {
        console.log(
          `    ${i + 1}. ${hb.timestamp} - ${hb.ipAddress} (${
            hb.responseTime
          }ms)`
        );
      });
    } else {
      console.log("Display not found in database");
    }

    // Check what might be triggering heartbeats
    console.log("\n=== ANALYSIS ===");
    console.log("Possible reasons for heartbeat requests:");
    console.log("1. Browser tab/window still open with display page");
    console.log("2. Monitoring dashboard polling for status");
    console.log("3. Background service or script running");
    console.log("4. Cached/stale browser session");
    console.log("5. Development server auto-refresh");

    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDisplays();
