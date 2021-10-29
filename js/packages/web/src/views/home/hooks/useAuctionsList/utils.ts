import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

import { AuctionViewState, AuctionView } from '../../../../hooks';

import { LiveAuctionViewState } from '../../auctionList';

// Check if the auction is primary sale or not
const checkPrimarySale = (auction: AuctionView): boolean =>
  auction.items.some(item =>
    item.some(({ metadata }) => metadata.info.primarySaleHappened),
  );

export const sortAuctionsByDate = (auctions: AuctionView[]): AuctionView[] =>
  auctions.sort(
    (a, b) =>
      a.auction.info.endedAt
        ?.sub(b.auction.info.endedAt || new BN(0))
        .toNumber() || 0,
  );

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
