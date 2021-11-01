import { MetaplexKey } from '../MetaplexKey';
import { decodeEntity } from '../../BaseEntity';
import { AuctionManagerV1, AuctionManagerV2 } from '../entities';
import { SCHEMA } from '../schema';

const decodeAuctionManagerV1 = decodeEntity(AuctionManagerV1, SCHEMA);
const decodeAuctionManagerV2 = decodeEntity(AuctionManagerV2, SCHEMA);

export const decodeAuctionManager = (buffer: Buffer, pubkey: string) => {
  return buffer[0] == MetaplexKey.AuctionManagerV1
    ? decodeAuctionManagerV1(buffer, pubkey)
    : decodeAuctionManagerV2(buffer, pubkey);
};
