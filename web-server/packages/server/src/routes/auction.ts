import {
  AUCTION_COLLECTION,
} from "../db/mongo-utils";
import { getGenericStoreCollectionRouter } from "./base";

const router = getGenericStoreCollectionRouter(AUCTION_COLLECTION);
export { router as auctionsRouter };
