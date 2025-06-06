import mongoose, { Mongoose } from 'mongoose';
import * as Keys from '../keys'; // Adjust path if Keys.ts is elsewhere relative to lib/

const MONGODB_URI = Keys.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env or keys.ts');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Augment the NodeJS Global type to include mongooseCache
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache;
}

let cached: MongooseCache = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    // console.log('Using cached database connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable command buffering if you want to handle errors immediately
      // useNewUrlParser: true, // Deprecated in Mongoose 6+
      // useUnifiedTopology: true, // Deprecated in Mongoose 6+
    };

    // console.log('Creating new database connection promise');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      // console.log('MongoDB connected successfully (new connection)');
      return mongooseInstance;
    }).catch(error => {
        console.error('MongoDB connection error in dbConnect:', error);
        cached.promise = null; // Reset promise on error so next attempt can try again
        throw error; // Re-throw error to be caught by caller
    });
  }

  try {
    // console.log('Awaiting database connection promise');
    cached.conn = await cached.promise;
  } catch (e) {
    // If the promise was rejected, clear it so we can try again
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
