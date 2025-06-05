const { spawn } = require("child_process");

console.log("🚀 Starting Digital Signage Server...");
console.log("📧 Admin Login: admin@example.com");
console.log("🔑 Password: admin123");
console.log("");

// Start the custom server
const server = spawn("bun", ["run", "server.ts"], {
  stdio: "inherit",
  cwd: process.cwd(),
});

server.on("error", (err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});

server.on("close", (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down server...");
  server.kill("SIGINT");
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down server...");
  server.kill("SIGTERM");
});
