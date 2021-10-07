import { AuctionManagerV1 } from "./entities/AuctionManagerV1";
import { AuctionManagerV2 } from "./entities/AuctionManagerV2";
import { decodeEntry } from "./entities/BaseEntry";
import { MetaplexKey } from "./MetaplexKey";

const decodeAuctionManagerV1 = decodeEntry(AuctionManagerV1);
const decodeAuctionManagerV2 = decodeEntry(AuctionManagerV2);

export const decodeAuctionManager = (buffer: Buffer, pubkey?: string) => {
  return buffer[0] == MetaplexKey.AuctionManagerV1
    ? decodeAuctionManagerV1(buffer, pubkey)
    : decodeAuctionManagerV2(buffer, pubkey);
};
