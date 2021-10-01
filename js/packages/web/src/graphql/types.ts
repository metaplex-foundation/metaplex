import {
  useQueryArtworks,
  useQueryAuction,
  useQueryAuctions,
  useQueryCreators,
} from '.';
import { QueryResultField } from './hooks/createQuery';

export {
  AuctionInputState,
  AuctionState,
  AuctionViewState,
  PriceFloorType,
} from './generated/graphql';

export type Artist = NonNullable<
  QueryResultField<typeof useQueryCreators, 'creators'>[0]
>;
export type Artwork = NonNullable<
  QueryResultField<typeof useQueryArtworks, 'artworks'>[0]
>;
export type AuctionExtra = QueryResultField<typeof useQueryAuction, 'auction'>;
export type Auction = QueryResultField<typeof useQueryAuctions, 'auctions'>[0];
