import { AccountInfo } from "@solana/web3.js";
import { deserializeUnchecked } from "borsh";
import { StringPublicKey } from "../ids";
import { StoreAccountDocument } from "./account";

export const BIDDER_POT_LEN = 32 + 32 + 32 + 1;
export class BidderPot {
  /// Points at actual pot that is a token account
  bidderPot: StringPublicKey;
  bidderAct: StringPublicKey;
  auctionAct: StringPublicKey;
  emptied: boolean;
  constructor(args: {
    bidderPot: StringPublicKey;
    bidderAct: StringPublicKey;
    auctionAct: StringPublicKey;
    emptied: boolean;
  }) {
    this.bidderPot = args.bidderPot;
    this.bidderAct = args.bidderAct;
    this.auctionAct = args.auctionAct;
    this.emptied = args.emptied;
  }
}

const BIDDER_POT_SCHEMA = new Map<any, any>([
  [
    BidderPot,
    {
      kind: "struct",
      fields: [
        ["bidderPot", "pubkeyAsString"],
        ["bidderAct", "pubkeyAsString"],
        ["auctionAct", "pubkeyAsString"],
        ["emptied", "u8"],
      ],
    },
  ],
]);

export const decodeBidderPot = (buffer: Buffer) => {
  return deserializeUnchecked(
    BIDDER_POT_SCHEMA,
    BidderPot,
    buffer
  ) as BidderPot;
};

export class BidderPotStoreAccountDocument extends StoreAccountDocument {
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
