import { MongoClient, MongoClientOptions } from 'mongodb';

export async function createOrm(
  mongoConnString: string,
  options?: MongoClientOptions & { dbName: string },
) {
  const client = new MongoClient(mongoConnString);
  await client.connect();
  return { db: client.db(options?.dbName ?? 'metaplex'), client };
}
