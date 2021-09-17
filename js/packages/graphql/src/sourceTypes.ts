import type {
  AuctionManagerV1,
  AuctionManagerV2,
  WhitelistedCreator,
  Metadata as Meta,
  AuctionData,
} from "./common";

export type FieldPubkey = { pubkey: string };

export type Artwork = Meta & FieldPubkey;
export type Creator = WhitelistedCreator & FieldPubkey;

export type Auction = AuctionData &
  FieldPubkey & {
    manager: (AuctionManagerV1 | AuctionManagerV2) & FieldPubkey;
  };
