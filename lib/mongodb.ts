import { MongoClient, Db, Collection } from "mongodb";

const uri = process.env.DATABASE_URI || "mongodb+srv://Admin:mongodbPASS@auth.rnlfnk4.mongodb.net/iit_research";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDb(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db("iit_research");
}

export async function getCollections(): Promise<{
  questions: Collection;
  responses: Collection;
  integrity: Collection;
}> {
  const db = await getDb();
  return {
    questions: db.collection("questions_collection"),
    responses: db.collection("responses_collection"),
    integrity: db.collection("integrity_collection"),
  };
}
