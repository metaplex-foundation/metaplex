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
  } = auctionView;

  const isOwner = auctionManager.authority === wallet?.publicKey?.toBase58();
  const isAuctionEnded = auction.info.endedAt;
  const canClaimPurchasedItem = !!(
    myBidderPot && !myBidderMetadata?.info.cancelled
  );
  const isAlreadyBought = !!(myBidderPot && myBidderMetadata?.info.cancelled);
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
