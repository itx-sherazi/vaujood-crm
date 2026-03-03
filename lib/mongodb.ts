import { MongoClient, Db } from "mongodb";

const uri =
  "mongodb+srv://devolper76_db_user:azNx3sQxOJiuiAGH@cluster0.ohgthoh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
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

