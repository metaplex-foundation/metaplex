import { AuctionState } from './enums';
import { AuctionData } from './entities';
import { AuctionViewState } from './enums';
import { isAuctionEnded } from './isAuctionEnded';

export function getAuctionState(auction: AuctionData): AuctionViewState {
  if (isAuctionEnded(auction)) {
    return AuctionViewState.Ended;
  }
  if (auction.state === AuctionState.Started) {
    return AuctionViewState.Live;
  }
  if (auction.state === AuctionState.Created) {
    return AuctionViewState.Upcoming;
  }
  return AuctionViewState.BuyNow;
}
