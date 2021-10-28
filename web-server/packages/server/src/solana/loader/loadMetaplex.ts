import { loadCreators } from "./loadCreators";
import {
  createMongoClient,
  DB,
  STORE_COLLECTIONS as STORES_COLLECTION,
} from "../../db/mongo-utils";
import { createDevNetConnection } from "../connection";
import { toPublicKey } from "../ids";
import { loadMetadata } from "./loadMetadata";
import { loadPrizeTrackingTickets } from "./loadPrizeTrackingTickets";
import { loadAuctionManagers } from "./loadAuctionManagers";
import { loadBidRedemptionTicketsV2 } from "./loadBidRedemptionTicketsV2";
import { loadBidRedemptionTicketsV1 } from "./loadBidRedemptionTicketsV1";
import { loadPayoutTickets } from "./loadPayoutTickets";
import 'log-timestamp'
import { MetaplexStoreAccountDocument } from "../accounts/store";

export const loadMetaplexData = async () => {
  const connection = createDevNetConnection();
  const dbClient = await createMongoClient();

  try {
    const stores = await dbClient
      .db(DB)
      .collection<MetaplexStoreAccountDocument>(STORES_COLLECTION)
      .find({})
      .toArray();

    const promises: Promise<any>[] = [];

    if (stores.length) {
      promises.push(loadBidRedemptionTicketsV2(connection, dbClient));
      promises.push(loadPrizeTrackingTickets(connection, dbClient));
      promises.push(loadBidRedemptionTicketsV1(connection, dbClient));
      promises.push(loadPayoutTickets(connection, dbClient));
    }

    const storePromises = stores.map(async (store) => {
      await loadCreators(store.store, connection, dbClient);
      await loadMetadata(store.store, connection, dbClient);
      await loadAuctionManagers(store.store, connection, dbClient);
    });
    await Promise.all(promises.concat(storePromises));
  } catch (err) {
    console.log(err);
  } finally {
    dbClient.close();
  }
};
