import mongoose from "mongoose";

// Import all models to ensure they are registered
import "./models/User";
import "./models/Display";
import "./models/Widget";
import "./models/Layout";
import "./models/Slide";
import "./models/Slideshow";
import "./models/Building";
import "./models/Room";
import "./models/Reservation";
import "./models/UserCalendarLink";
import "./models/DisplayAlert";
import "./models/DisplayHeartbeat";
import "./models/DisplayStatus";
import "./models/FeatureFlag";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

// Define the type for the global mongoose cache
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend the global object to include mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
