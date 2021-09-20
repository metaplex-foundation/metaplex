import type {
  AuctionManagerV1,
  AuctionManagerV2,
  WhitelistedCreator,
  Metadata as Meta,
  AuctionData,
} from "../common";

export type FieldPubkey = { pubkey: string };
export type Fields<T> = T & FieldPubkey;

export type Artwork = Fields<Meta>;
export type Creator = Fields<WhitelistedCreator>;

export type Auction = Fields<AuctionData> & {
  manager: (AuctionManagerV1 | AuctionManagerV2) & FieldPubkey;
};
