import { MongoClient } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedClientPromise: Promise<MongoClient> | null = null;

export async function getMongoClient() {
  if (cachedClient) return cachedClient;
  if (cachedClientPromise) return cachedClientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI must be defined in environment variables.");
  }

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
  });

  cachedClientPromise = client
    .connect()
    .then(() => {
      cachedClient = client;
      return client;
    })
    .catch(async (error) => {
      cachedClientPromise = null;
      await client.close();
      throw error;
    });

  return cachedClientPromise;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB || "portfolio");
}
