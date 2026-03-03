import { MongoClient, Db } from "mongodb";

// Live par MONGODB_URI env variable set karo (Vercel/hosting dashboard). Local par fallback use hota hai.
const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://devolper76_db_user:azNx3sQxOJiuiAGH@cluster0.ohgthoh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const dbName = process.env.MONGODB_DB || "vujood-crm";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  try {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    db = client.db(dbName);
    return db;
  } catch (err) {
    // Serverless (live) par purana connection disconnect ho sakta hai – cache clear karke retry
    client = null;
    db = null;
    const message =
      err instanceof Error ? err.message : "Unknown database error";
    throw new Error(
      `Database connection failed: ${message}. Live par Atlas Network Access check karo: 0.0.0.0/0 allow karo.`,
    );
  }
}
