import {MongoClient} from 'mongodb';
export const DB = "metaplex";
export const CREATORS_COLLECTION = "whiteListedCreators";
export const METADATA_COLLECTION = "metadata";

export const createMongoClient = async () => {
    const client = new MongoClient(process.env.MONGO_DB_CONNECTION_STRING!);
    await client.connect();
    return client;
}