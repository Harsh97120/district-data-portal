import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB_NAME || "district_portal";

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _indexesInitialized: boolean | undefined;
}

if (!uri) {
  // In development, allow the app to boot without crashing immediately,
  // but operations that query MongoDB will receive a descriptive error.
  console.warn("⚠️ MONGODB_URI is not defined in environment variables. Database operations will fail until configured.");
} else {
  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so the MongoClient is preserved across module reloads.
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 5000,
      });
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, avoid using a global variable.
    client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect();
  }
}

/**
 * Retrieve the active MongoDB database instance with connection pooling.
 */
export async function getDb(): Promise<Db> {
  if (!uri || !clientPromise) {
    throw new Error(
      "MongoDB connection URI is not configured. Please set MONGODB_URI in your .env.local file."
    );
  }

  const client = await clientPromise;
  const db = client.db(dbName);

  // Initialize essential indexes once per process lifecycle
  if (!global._indexesInitialized) {
    try {
      await Promise.all([
        // Users collection indexes
        db.collection("users").createIndex({ email: 1 }, { unique: true, background: true }),
        db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true, background: true }),
        db.collection("users").createIndex({ providerAccountId: 1 }, { sparse: true, background: true }),

        // OTP Verifications collection indexes (with TTL for automatic expiry)
        db.collection("otp_verifications").createIndex({ email: 1 }, { background: true }),
        db.collection("otp_verifications").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true }),

        // Password Resets collection indexes (with TTL for automatic expiry)
        db.collection("password_resets").createIndex({ email: 1 }, { background: true }),
        db.collection("password_resets").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true }),

        // Activities collection indexes (scoped by userId, sorted by date)
        db.collection("activities").createIndex({ userId: 1, createdAt: -1 }, { background: true }),
        db.collection("activities").createIndex({ userId: 1, actionType: 1, createdAt: -1 }, { background: true }),
      ]);
      global._indexesInitialized = true;
    } catch (idxErr) {
      console.warn("Notice: Initializing database indexes:", idxErr);
    }
  }

  return db;
}

export default clientPromise;
