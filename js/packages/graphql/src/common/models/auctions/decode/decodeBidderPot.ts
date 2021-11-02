import { decodeEntity } from '../../BaseEntity';
import { BidderPot } from '../entities';
import { AUCTION_SCHEMA } from '../schema';

export const decodeBidderPot = decodeEntity(BidderPot, AUCTION_SCHEMA);
