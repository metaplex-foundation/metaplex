import { decodeEntity } from '../../BaseEntity';
import { AuctionDataExtended } from '../entities';
import { AUCTION_SCHEMA } from '../schema';

export const decodeAuctionDataExtended = decodeEntity(
  AuctionDataExtended,
  AUCTION_SCHEMA,
);
