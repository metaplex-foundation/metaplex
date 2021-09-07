import type { Metadata as Meta, AuctionData } from '@oyster/common';
import type { WhitelistedCreator } from '@oyster/common/dist/lib/models/index';

type FieldPubkey = { pubkey: string };

export type Artwork = Meta & FieldPubkey;
export type Creator = WhitelistedCreator & FieldPubkey;
export type Auction = AuctionData & FieldPubkey;
