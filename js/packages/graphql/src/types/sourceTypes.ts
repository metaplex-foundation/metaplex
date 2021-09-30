import type {
  AuctionManagerV1,
  AuctionManagerV2,
  WhitelistedCreator,
  Metadata as Meta,
  AuctionData,
} from "../common/index";

export type FieldPubkey = { pubkey: string };
export type Fields<T> = T & FieldPubkey;

export type Artwork = Fields<Meta>;
export type Creator = Fields<WhitelistedCreator>;

export type AuctionManager = Fields<AuctionManagerV1 | AuctionManagerV2>;
export type Auction = Fields<AuctionData> & {
  manager: AuctionManager;
};
