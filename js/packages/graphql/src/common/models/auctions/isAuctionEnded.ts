import moment from 'moment';
import { AuctionData } from './entities';

export const isAuctionEnded = (auction: AuctionData) => {
  const now = moment().unix();
  if (!auction.endedAt) return false;

  if (auction.endedAt.toNumber() > now) return false;

  if (auction.endedAt.toNumber() <= now) {
    if (auction.auctionGap && auction.lastBid) {
      const newEnding =
        auction.auctionGap.toNumber() + auction.lastBid.toNumber();
      return newEnding < now;
    }
    return true;
  }

  return false;
};
