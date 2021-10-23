import {
    AUCTION_COLLECTION, AUCTION_DATA_EXTENDED_COLLECTION,
  } from "../db/mongo-utils";
  import { getStoreGenericRouter } from "./base";

  const router = getStoreGenericRouter(AUCTION_DATA_EXTENDED_COLLECTION);
  export { router as auctionDataExtended };
