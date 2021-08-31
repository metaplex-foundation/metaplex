import type { Metadata as Meta, AuctionData } from '@oyster/common';
import type {
  AuctionManagerV1,
  AuctionManagerV2,
  WhitelistedCreator,
} from '@oyster/common/dist/lib/models/index';

export type FieldPubkey = { pubkey: string };

export type Artwork = Meta & FieldPubkey;
export type Creator = WhitelistedCreator & FieldPubkey;

export type Auction = AuctionData &
  FieldPubkey & {
    manager: (AuctionManagerV1 | AuctionManagerV2) & FieldPubkey;
  };
