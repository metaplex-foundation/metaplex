import {
    AUCTION_DATA_EXTENDED_COLLECTION,
  } from "../db/mongo-utils";
  import { getGenericStoreCollectionRouter } from "./base";

  const router = getGenericStoreCollectionRouter(AUCTION_DATA_EXTENDED_COLLECTION);
  export { router as auctionDataExtended };
