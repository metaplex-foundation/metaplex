import {MongoClient} from 'mongodb';
export const DB = "metaplex";
export const CREATORS_COLLECTION = "whiteListedCreators";
export const METADATA_COLLECTION = "metadata";
export const EDITIONS_COLLECTION = "editions";
export const MASTER_EDITIONS_V1_COLLECTION = "masterEditionsV1";
export const MASTER_EDITIONS_V2_COLLECTION = "masterEditionsV2";

export const createMongoClient = async () => {
    const client = new MongoClient(process.env.MONGO_DB_CONNECTION_STRING!);
    await client.connect();
    return client;
}