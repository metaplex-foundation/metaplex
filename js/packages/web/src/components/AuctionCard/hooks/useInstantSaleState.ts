import { useWallet } from '@solana/wallet-adapter-react';
import { AuctionView } from '../../../hooks';
import { BidStateType } from '@oyster/common';

interface ActionButtonContentProps {
  isInstantSale: boolean;
  isAlreadyBought: boolean;
  canClaimItem: boolean;
  canClaimPurchasedItem: boolean;
  canEndInstantSale: boolean;
}

export const useInstantSaleState = (
  auctionView: AuctionView,
): ActionButtonContentProps => {
  const wallet = useWallet();

  const {
    isInstantSale,
    auctionManager,
    auction,
    myBidRedemption,
    myBidderPot,
    myBidderMetadata,
  } = auctionView;

  const items = auctionView.items;
  let isAlreadyBought: boolean = false;
  const isBidCanceled = !!myBidderMetadata?.info.cancelled;
  let canClaimPurchasedItem: boolean = false;
  if (auctionView.auction.info.bidState.type == BidStateType.EnglishAuction) {
    for (const item of items) {
      for (const subItem of item) {
        const bidRedeemed = myBidRedemption?.info.getBidRedeemed(
          subItem.safetyDeposit.info.order,
        );
        isAlreadyBought = bidRedeemed ? bidRedeemed : false;
        if (isAlreadyBought) break;
      }
    }
    canClaimPurchasedItem =
      !!(myBidderPot && !isBidCanceled) && !isAlreadyBought;
  } else {
    isAlreadyBought = !!(myBidderPot && isBidCanceled);
    canClaimPurchasedItem = !!(myBidderPot && !isBidCanceled);
  }

  const isOwner = auctionManager.authority === wallet?.publicKey?.toBase58();
  const isAuctionEnded = auction.info.endedAt;
  const canClaimItem = !!(isOwner && isAuctionEnded);
  const canEndInstantSale = isOwner && !isAuctionEnded;

  return {
    isInstantSale,
    isAlreadyBought,
    canClaimItem,
    canClaimPurchasedItem,
    canEndInstantSale,
  };
};
