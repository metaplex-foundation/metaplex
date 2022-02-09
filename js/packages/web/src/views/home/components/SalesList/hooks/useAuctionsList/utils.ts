import { PublicKey } from '@solana/web3.js';

import { AuctionViewState, AuctionView } from '../../../../../../hooks';

import { LiveAuctionViewState } from '../..';

// Check if the auction is primary sale or not
const checkPrimarySale = (auction: AuctionView): boolean =>
  auction.thumbnail.metadata.info.primarySaleHappened;

// Removed resales from live auctions
const liveAuctionsFilter = (auction: AuctionView): boolean =>
  auction.state === AuctionViewState.Live && !checkPrimarySale(auction);

const participatedAuctionsFilter = (
  auction: AuctionView,
  bidderPublicKey?: PublicKey | null,
): boolean =>
  auction.state !== AuctionViewState.Defective &&
  auction.auction.info.bidState.bids.some(
    b => b.key == bidderPublicKey?.toBase58(),
  );

export const resaleAuctionsFilter = (auction: AuctionView): boolean =>
  auction.state === AuctionViewState.Live && checkPrimarySale(auction);

const endedAuctionsFilter = ({ state }: AuctionView): boolean =>
  [AuctionViewState.Ended, AuctionViewState.BuyNow].includes(state);

export const getFilterFunction = (
  activeKey: LiveAuctionViewState,
): ((auction: AuctionView, bidderPublicKey?: PublicKey | null) => boolean) => {
  switch (activeKey) {
    case LiveAuctionViewState.All:
      return liveAuctionsFilter;
    case LiveAuctionViewState.Participated:
      return participatedAuctionsFilter;
    case LiveAuctionViewState.Resale:
      return resaleAuctionsFilter;
      break;
    case LiveAuctionViewState.Ended:
      return endedAuctionsFilter;
  }
};
