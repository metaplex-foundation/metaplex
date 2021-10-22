import { bnConverter } from "../../serialization/converters/bnConverter";
import { uint8ArrayConverter } from "../../serialization/converters/uint8arrayConverter";
import { ConverterSet } from "../../serialization/converterSet";

export const auctionConverters = new ConverterSet([
  ["priceFloor.hash", uint8ArrayConverter],
  ["lastBid", bnConverter],
  ["endedAt", bnConverter],
  ["endAuctionAt", bnConverter],
  ["auctionGap", bnConverter],
  ["priceFloor.minPrice", bnConverter],
  ["bidState.max", bnConverter],
  ["bidState.bids.amount", bnConverter],
]);
