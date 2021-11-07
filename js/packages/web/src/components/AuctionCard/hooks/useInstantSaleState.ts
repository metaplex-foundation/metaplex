import { useWallet } from '@solana/wallet-adapter-react';
import { AuctionView } from '../../../hooks';

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
    myBidderPot,
    myBidderMetadata,
    myBidRedemption,
  } = auctionView;

  const isOwner = auctionManager.authority === wallet?.publicKey?.toBase58();
  const isAuctionEnded = auction.info.endedAt;
  const isBidCanceled = !!myBidderMetadata?.info.cancelled;
  let winnerIndex;
  if (auctionView.myBidderPot?.pubkey)
    winnerIndex = auctionView.auction.info.bidState.getWinnerIndex(
      auctionView.myBidderPot?.info.bidderAct,
    );
  const isAlreadyBought = !!myBidRedemption?.info.getBidRedeemed(
    auctionView.items[0][0].safetyDeposit.info.order,
  );
  const canClaimPurchasedItem =
    isAlreadyBought &&
    !myBidRedemption?.info.getBidRedeemed(
      auctionView.items[0][0].safetyDeposit.info.order,
    );

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
