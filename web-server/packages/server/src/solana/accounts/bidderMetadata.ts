import { AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import { deserializeUnchecked } from "borsh";
import { StringPublicKey } from "../ids";
import { StoreAccountDocument } from "./account";

export const BIDDER_METADATA_LEN = 32 + 32 + 8 + 8 + 1;
export class BidderMetadata {
  // Relationship with the bidder who's metadata this covers.
  bidderPubkey: StringPublicKey;
  // Relationship with the auction this bid was placed on.
  auctionPubkey: StringPublicKey;
  // Amount that the user bid.
  lastBid: BN;
  // Tracks the last time this user bid.
  lastBidTimestamp: BN;
  // Whether the last bid the user made was cancelled. This should also be enough to know if the
  // user is a winner, as if cancelled it implies previous bids were also cancelled.
  cancelled: boolean;
  constructor(args: {
    bidderPubkey: StringPublicKey;
    auctionPubkey: StringPublicKey;
    lastBid: BN;
    lastBidTimestamp: BN;
    cancelled: boolean;
  }) {
    this.bidderPubkey = args.bidderPubkey;
    this.auctionPubkey = args.auctionPubkey;
    this.lastBid = args.lastBid;
    this.lastBidTimestamp = args.lastBidTimestamp;
    this.cancelled = args.cancelled;
  }
}

export const BIDDER_METADATA_SCHEMA = new Map<any, any>([
  [
    BidderMetadata,
    {
      kind: "struct",
      fields: [
        ["bidderPubkey", "pubkeyAsString"],
        ["auctionPubkey", "pubkeyAsString"],
        ["lastBid", "u64"],
        ["lastBidTimestamp", "u64"],
        ["cancelled", "u8"],
      ],
    },
  ],
]);

export const decodeBidderMetadata = (buffer: Buffer) => {
  return deserializeUnchecked(
    BIDDER_METADATA_SCHEMA,
    BidderMetadata,
    buffer
  ) as BidderMetadata;
};

export class BidderMetadataStoreAccountDocument extends StoreAccountDocument {
  bidderPubkey: string;
  auctionPubkey: string;
  constructor(
    store: string,
    pubkey: string,
    account: AccountInfo<Buffer>,
    bidderPubkey: string,
    auctionPubkey: string
  ) {
    super(store, pubkey, account);
    this.bidderPubkey = bidderPubkey;
    this.auctionPubkey = auctionPubkey;
  }
}
