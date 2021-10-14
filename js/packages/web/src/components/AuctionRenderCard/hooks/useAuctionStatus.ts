import {
  BidStateType,
  formatTokenAmount,
  fromLamports,
  PriceFloorType,
  useMint,
} from '@oyster/common';
import {
  AuctionView,
  AuctionViewState,
  useBidsForAuction,
  useHighestBidForAuction,
} from '../../../hooks';
import { BN } from 'bn.js';

interface AuctionStatusLabels {
  status: string;
  amount: string | number;
  ended: boolean;
}

export const useAuctionStatus = (
  auctionView: AuctionView,
): AuctionStatusLabels => {
  const bids = useBidsForAuction(auctionView.auction.pubkey);
  const winningBid = useHighestBidForAuction(auctionView.auction.pubkey);
  const mintInfo = useMint(auctionView.auction.info.tokenMint);

  const participationFixedPrice =
    auctionView.auctionManager.participationConfig?.fixedPrice || 0;
  const participationOnly = auctionView.auctionManager.numWinners.eq(new BN(0));
  const priceFloor =
    auctionView.auction.info.priceFloor.type === PriceFloorType.Minimum
      ? auctionView.auction.info.priceFloor.minPrice?.toNumber() || 0
      : 0;

  let status = 'Starting Bid';

  let amount: string | number = fromLamports(
    participationOnly ? participationFixedPrice : priceFloor,
    mintInfo,
  );

  const countdown = auctionView.auction.info.timeToEnd();

  const ended =
    countdown?.hours === 0 &&
    countdown?.minutes === 0 &&
    countdown?.seconds === 0;

  if (auctionView.isInstantSale) {
    const soldOut = bids.length === auctionView.items.length;
    const isOpen =
      auctionView.auction.info.bidState.type === BidStateType.OpenEdition;

    status = auctionView.state === AuctionViewState.Ended ? 'Ended' : 'Price';

    if (soldOut && !isOpen) {
      status = 'Sold Out';
    }

    amount = formatTokenAmount(
      auctionView.auctionDataExtended?.info.instantSalePrice?.toNumber(),
    );

    return {
      status,
      amount,
      ended,
    };
  }

  if (bids.length > 0) {
    amount = formatTokenAmount(winningBid.info.lastBid);
    status = 'Current Bid';
  }

  if (ended) {
    if (bids.length === 0) {
      return {
        status: 'Ended',
        amount,
        ended,
      };
    }

    return {
      status: 'Winning Bid',
      amount,
      ended,
    };
  }

  return {
    status,
    amount,
    ended,
  };
};
