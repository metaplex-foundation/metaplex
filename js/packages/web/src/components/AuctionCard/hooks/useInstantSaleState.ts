import { useWallet } from '@solana/wallet-adapter-react';
import { AuctionView } from '../../../hooks';

interface ActionButtonContentProps {
  isInstantSale: boolean;
  canClaimItem: boolean;
  canClaimPurchasedItem: boolean;
  canEndInstantSale: boolean;
}

export const useInstantSaleState = (
  auctionView: AuctionView,
): ActionButtonContentProps => {
  const wallet = useWallet();

  const { isInstantSale, auctionManager, auction, myBidderPot } = auctionView;

  const isOwner = auctionManager.authority === wallet?.publicKey?.toBase58();
  const isAuctionEnded = auction.info.endedAt;
  const canClaimPurchasedItem = !!myBidderPot;
  const canClaimItem = !!(isOwner && isAuctionEnded);
  const canEndInstantSale = isOwner && !isAuctionEnded;

  return {
    isInstantSale,
    canClaimItem,
    canClaimPurchasedItem,
    canEndInstantSale,
  };
};
