import { AuctionView } from '../../../hooks';
import { useInstantSaleState } from './useInstantSaleState';

export const useActionButtonContent = (auctionView: AuctionView): string => {
  const {
    isInstantSale,
    canClaimItem,
    canClaimPurchasedItem,
    canEndInstantSale,
  } = useInstantSaleState(auctionView);
  //old was place bid
  if (!isInstantSale) {
    return 'Place Bid';
  }

  if (canClaimPurchasedItem) {
    return 'Claim Purchase';
  }

  if (canClaimItem) {
    return 'Claim item';
  }

  if (canEndInstantSale) {
    return 'Cancel Listing ';
  }

  return 'Buy';
};
