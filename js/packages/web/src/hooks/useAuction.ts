import { StringPublicKey } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import {
  AuctionView,
  processAccountsIntoAuctionView,
  useCachedRedemptionKeysByWallet,
} from '.';
import { getAuction } from './getData';

export const useAuction = (id: StringPublicKey) => {
  const { publicKey } = useWallet();
  const cachedRedemptionKeys = useCachedRedemptionKeysByWallet();

  const [existingAuctionView, setAuctionView] =
    useState<AuctionView | undefined>(undefined);
  const walletPubkey = publicKey?.toBase58();

  const getAuctionAsync = async () => {
    const auction = await getAuction(id);
    const auctionView = await processAccountsIntoAuctionView(
      walletPubkey,
      auction,
      cachedRedemptionKeys,
      undefined,
      existingAuctionView || undefined,
    );
    if (auctionView) setAuctionView(auctionView);
  };

  useEffect(() => {
    getAuctionAsync();
  }, [walletPubkey, cachedRedemptionKeys]);
  return existingAuctionView;
};
