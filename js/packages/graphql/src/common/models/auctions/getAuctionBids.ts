import { BidderMetadata } from './entities';
import { ParsedAccount } from '../accounts';
import { StringPublicKey } from '../../utils';

export function getAuctionBids(
  bidderMetadataByAuctionAndBidder: ParsedAccount<BidderMetadata>[],
  auctionId?: StringPublicKey,
) {
  return bidderMetadataByAuctionAndBidder
    .filter(bid => {
      bid.info.auctionPubkey === auctionId;
    })
    .sort((a, b) => {
      const lastBidDiff = b.info.lastBid.sub(a.info.lastBid).toNumber();
      if (lastBidDiff === 0) {
        return a.info.lastBidTimestamp.sub(b.info.lastBidTimestamp).toNumber();
      }

      return lastBidDiff;
    });
}
