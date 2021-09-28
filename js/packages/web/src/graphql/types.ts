import { useQueryAuction, useQueryAuctions, useQueryCreators } from '.';
import { QueryResultField } from './hooks/createQuery';

export type Artist = QueryResultField<typeof useQueryCreators, 'creators'>[0];
export type AuctionExtra = QueryResultField<typeof useQueryAuction, 'auction'>;
export type Auction = QueryResultField<typeof useQueryAuctions, 'auctions'>[0];
