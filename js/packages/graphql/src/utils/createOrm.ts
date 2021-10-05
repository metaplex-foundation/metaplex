import { MongoClient } from "mongodb";

export async function createOrm(mongoConnString: string) {
  const client = new MongoClient(mongoConnString);
  await client.connect();
  return client.db("metaplex");
}
