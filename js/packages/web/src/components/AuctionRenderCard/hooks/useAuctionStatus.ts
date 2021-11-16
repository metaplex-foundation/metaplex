import {
  AuctionState,
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
  const isOpen =
    auctionView.auction.info.bidState.type === BidStateType.OpenEdition;

  if (isOpen) {
    status = 'Open Sale';
  }

  const ended =
    countdown?.hours === 0 &&
    countdown?.minutes === 0 &&
    countdown?.seconds === 0 &&
    auctionView.auction.info.state === AuctionState.Ended;

  if (auctionView.isInstantSale) {
    const soldOut = bids.length === auctionView.items.length;

    status = auctionView.state === AuctionViewState.Ended ? 'Ended' : 'Price';

    if (soldOut && !isOpen) {
      status = 'Sold Out';
    }

    amount = formatTokenAmount(
      auctionView.auctionDataExtended?.info.instantSalePrice?.toNumber(),
      mintInfo
    );

    return {
      status,
      amount,
    };
  }

  if (bids.length > 0 && !isOpen) {
    amount = formatTokenAmount(winningBid.info.lastBid);
    status = 'Current Bid';
  }

  if (ended) {
    if (bids.length === 0) {
      return {
        status: 'Ended',
        amount,
      };
    }

    return {
      status: 'Winning Bid',
      amount,
    };
  }

  return {
    status,
    amount,
  };
};
