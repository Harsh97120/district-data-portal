import { MongoClient, Db } from "mongodb";
import tls from "tls";

// Enforce TLS 1.2 as maximum version to resolve OpenSSL 3.5.2 / Node.js 22 incompatibility
// with MongoDB Atlas clusters that reject TLS 1.3 ClientHello with SSL alert 80.
// Standard certificate validation (rejectUnauthorized) remains 100% strictly enforced.
if (tls.DEFAULT_MAX_VERSION === "TLSv1.3") {
  tls.DEFAULT_MAX_VERSION = "TLSv1.2";
}

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _indexesInitialized: boolean | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) {
    throw new Error(
      "MongoDB connection URI is not configured. Please set MONGODB_URI in your .env.local file."
    );
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so the MongoClient is preserved across module reloads.
    if (!global._mongoClientPromise) {
      const devClient = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 10000,
        retryWrites: true,
        retryReads: true,
      });
      global._mongoClientPromise = devClient.connect().catch((err) => {
        global._mongoClientPromise = undefined;
        throw err;
      });
    }
    return global._mongoClientPromise;
  }

  // In production mode, cache on module-level clientPromise
  if (!clientPromise) {
    const prodClient = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
    });
    clientPromise = prodClient.connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}


/**
 * Retrieve the active MongoDB database instance with connection pooling.
 */
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const dbName = (process.env.MONGODB_DB_NAME || "district_portal").trim();
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

export { getClientPromise };
export default getClientPromise;

