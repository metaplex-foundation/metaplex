import {MongoClient} from 'mongodb';
export const DB = "metaplex";
export const CREATORS_COLLECTION = "whiteListedCreators";
export const METADATA_COLLECTION = "metadata";
export const EDITIONS_COLLECTION = "editions";
export const MASTER_EDITIONS_V1_COLLECTION = "masterEditionsV1";
export const MASTER_EDITIONS_V2_COLLECTION = "masterEditionsV2";
export const PRIZE_TRACKING_TICKETS_COLLECTION = "prizeTrackingTickets";
export const AUCTION_MANAGERS_COLLECTION = "auctionManagers";
export const VAULTS_COLLECTION = "vaults";
export const SAFETY_DEPOSIT_BOX_COLLECTION = "safetyDepositBoxes";
export const SAFETY_DEPOSIT_CONFIG_COLLECTION = "safetyDepositConfigs ";
export const AUCTION_COLLECTION = "auctions";
export const AUCTION_DATA_EXTENDED_COLLECTION = "auctionDataExtended";
export const STORE_COLLECTIONS = "stores";
export const BID_REDEMPTION_TICKETS_V2_COLLECTION = "bidRedemptionTicketsV2";

export const createMongoClient = async () => {
    const client = new MongoClient(process.env.MONGO_DB_CONNECTION_STRING!);
    await client.connect();
    return client;
}