import { MongoClient, Db } from "mongodb";

const uri = "mongodb://127.0.0.1:27017/vujood-crm";
const dbName = "vujood-crm";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;

  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }

  db = client.db(dbName);
  return db;
}

