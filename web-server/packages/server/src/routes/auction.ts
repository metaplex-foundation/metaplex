import {
  AUCTION_COLLECTION,
} from "../db/mongo-utils";
import { getStoreGenericRouter } from "./base";

const router = getStoreGenericRouter(AUCTION_COLLECTION);
export { router as auctionsRouter };
