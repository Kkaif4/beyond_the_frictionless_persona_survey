import { MongoClient, Db, Collection } from "mongodb";

const DEFAULT_FALLBACK_URI =
  "mongodb+srv://Admin:mongodbPASS@auth.rnlfnk4.mongodb.net/iit_research";

function getMongoUri(): string {
  const envUri = process.env.DATABASE_URI;
  // If undefined or accidentally using placeholder from .env.example
  if (!envUri || envUri.includes("<username>") || envUri.includes("cluster.mongodb.net")) {
    return DEFAULT_FALLBACK_URI;
  }
  return envUri;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = getMongoUri();

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  // In production / serverless environments
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export default getClientPromise;

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db("iit_research");
}

export async function getCollections(): Promise<{
  questions: Collection;
  sections: Collection;
  responses: Collection;
  integrity: Collection;
}> {
  const db = await getDb();
  return {
    questions: db.collection("questions_collection"),
    sections: db.collection("sections_collection"),
    responses: db.collection("responses_collection"),
    integrity: db.collection("integrity_collection"),
  };
}
