import { deserializeUnchecked } from "borsh";
import { AuctionManagerV1 } from "./entities/AuctionManagerV1";
import { AuctionManagerV2 } from "./entities/AuctionManagerV2";
import { SCHEMA } from "./schema";
import { MetaplexKey } from "./MetaplexKey";

export function decodeAuctionManager(
  buffer: Buffer
): AuctionManagerV1 | AuctionManagerV2 {
  return buffer[0] == MetaplexKey.AuctionManagerV1
    ? deserializeUnchecked(SCHEMA, AuctionManagerV1, buffer)
    : deserializeUnchecked(SCHEMA, AuctionManagerV2, buffer);
}
