import mongoose from "mongoose";
import dns from "dns";

// mongodb+srv:// needs a DNS SRV lookup to find the cluster's real hosts before it
// can connect at all. Some local/ISP/router DNS servers are flaky or refuse SRV-type
// queries specifically (EREFUSED) even though plain A/CNAME lookups work fine — this
// has bitten this project locally before. Preferring well-known public resolvers here
// avoids depending on whatever DNS server the current network happens to hand out.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Non-fatal — worst case, DNS resolution falls back to the OS default.
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://hrjunecoinfotech_db_user:Shivam%402026@shivam.i1f8b3t.mongodb.net/valueplus?retryWrites=true&w=majority&appName=Shivam";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: "valueplus",
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4, // IPv4 first for faster DNS resolution
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default connectToDatabase;
