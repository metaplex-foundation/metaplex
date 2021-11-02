import { decodeEntity } from '../../BaseEntity';
import { AuctionData } from '../entities';
import { AUCTION_SCHEMA } from '../schema';

export const decodeAuction = decodeEntity(AuctionData, AUCTION_SCHEMA);
