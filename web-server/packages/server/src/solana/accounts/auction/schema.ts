import { AuctionData, Bid, BidState, PriceFloor } from "./auction";
import {deserializeUnchecked} from 'borsh';

export const AUCTION_SCHEMA = new Map<any, any>([
  [
    AuctionData,
    {
      kind: "struct",
      fields: [
        ["authority", "pubkeyAsString"],
        ["tokenMint", "pubkeyAsString"],
        ["lastBid", { kind: "option", type: "u64" }],
        ["endedAt", { kind: "option", type: "u64" }],
        ["endAuctionAt", { kind: "option", type: "u64" }],
        ["auctionGap", { kind: "option", type: "u64" }],
        ["priceFloor", PriceFloor],
        ["state", "u8"],
        ["bidState", BidState],
      ],
    },
  ],
  [
    PriceFloor,
    {
      kind: 'struct',
      fields: [
        ['type', 'u8'],
        ['hash', [32]],
      ],
    },
  ],
  [
    BidState,
    {
      kind: 'struct',
      fields: [
        ['type', 'u8'],
        ['bids', [Bid]],
        ['max', 'u64'],
      ],
    },
  ],
  [Bid,
  {
    kind: 'struct',
    fields: [
      ['key', 'pubkeyAsString'],
      ['amount', 'u64'],
    ],
  },
]]);

export const decodeAuctionData = (buffer: Buffer) => {
  return deserializeUnchecked(
    AUCTION_SCHEMA,
    AuctionData,
    buffer,
  ) as AuctionData;
};
