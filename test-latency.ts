import mongoose from "mongoose";

async function test() {
  const start = Date.now();
  await mongoose.connect("mongodb://127.0.0.1:27017/test", {
    serverSelectionTimeoutMS: 5000,
  });
  console.log("✅ Mongoose connected in", Date.now() - start, "ms");
  await mongoose.disconnect();
}

test().catch(console.error);
