
import { loadCreators } from "./loadCreators";
import { createMongoClient, DB, STORE_COLLECTIONS as STORES_COLLECTION } from "../../db/mongo-utils";
import { createDevNetConnection } from "../connection";
import { toPublicKey } from "../ids";
import { loadMetadata } from "./loadMetadata";
import { loadPrizeTrackingTickets } from "./loadPrizeTrackingTickets";
import { loadAuctionManagers } from "./loadAuctionManagers";
import { Store } from "../../routes/store";

export const loadMetaplexData = async () => {
    const connection = createDevNetConnection();
    const dbClient = await createMongoClient();

    const stores = await dbClient.db(DB).collection<Store>(STORES_COLLECTION).find({}).toArray();

    stores.forEach(async store => {
      await loadCreators(store.address, connection, dbClient);
      await loadMetadata(store.address, connection, dbClient);
      loadPrizeTrackingTickets(store.address, connection, dbClient);
      loadAuctionManagers(store.address, connection, dbClient);
    })
  }
