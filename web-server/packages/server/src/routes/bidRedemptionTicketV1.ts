import {
    BID_REDEMPTION_TICKETS_V1_COLLECTION,
  } from "../db/mongo-utils";
  import { getGenericCollectionRouter, getGenericStoreCollectionRouter } from "./base";

  const router = getGenericCollectionRouter(BID_REDEMPTION_TICKETS_V1_COLLECTION);
  export { router as bidRedemptionTicketsV1Router };
