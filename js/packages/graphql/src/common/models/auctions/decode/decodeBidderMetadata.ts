import { decodeEntity } from '../../BaseEntity';
import { BidderMetadata } from '../entities';
import { AUCTION_SCHEMA } from '../schema';

export const decodeBidderMetadata = decodeEntity(
  BidderMetadata,
  AUCTION_SCHEMA,
);
