import { fromLamports, useMint, PriceFloorType } from '@oyster/common';
import {
  AuctionView,
  AuctionViewState,
  useBidsForAuction,
  useHighestBidForAuction,
} from '../../../hooks';
import { BN } from 'bn.js';

export type AuctionStatus =
  | {
      isInstantSale: false;
      isLive: boolean;
      hasBids: boolean;
    }
  | {
      isInstantSale: true;
      isLive: boolean;
      soldOut: boolean;
    };

interface AuctionStatusLabels {
  status: AuctionStatus;
  amount: string | number;
}

export const getHumanStatus = (status: AuctionStatus): string => {
  // isInstantSale cannot be destructured due to TypeScript type limitations
  const { isLive } = status;

  if (status.isInstantSale) {
    const { soldOut } = status;

    if (soldOut) {
      return 'Sold Out';
    } else if (isLive) {
      return '';
    }

    return 'Ended';
  } else {
    const { hasBids } = status;

    if (isLive) {
      return hasBids ? 'Current Bid' : 'Starting Bid';
    } else {
      return hasBids ? 'Winning Bid' : 'Ended';
    }
  }
};

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

  let amount: number = fromLamports(
    participationOnly ? participationFixedPrice : priceFloor,
    mintInfo,
  );

  const countdown = auctionView.auction.info.timeToEnd();

  let isLive = auctionView.state !== AuctionViewState.Ended;

  if (auctionView.isInstantSale) {
    const soldOut =
      bids.length === auctionView.auctionManager.numWinners.toNumber();

    amount =
      auctionView.auctionDataExtended?.info.instantSalePrice?.toNumber() || 0;

    return {
      status: { isInstantSale: true, isLive, soldOut },
      amount,
    };
  }

  isLive =
    isLive &&
    !(
      countdown?.days === 0 &&
      countdown?.hours === 0 &&
      countdown?.minutes === 0 &&
      countdown?.seconds === 0
    );

  const hasBids = bids.length > 0;

  if (hasBids && winningBid) {
    amount = fromLamports(winningBid.info.lastBid);
  }

  return {
    status: {
      isInstantSale: false,
      isLive,
      hasBids,
    },
    amount,
  };
};
