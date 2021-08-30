import { StringPublicKey } from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import {
  AuctionView,
  processAccountsIntoAuctionView,
  useCachedRedemptionKeysByWallet,
} from '.';
import { useMeta } from '../contexts';

export const useAuction = (id: StringPublicKey) => {
  const { publicKey } = useWallet();
  const cachedRedemptionKeys = useCachedRedemptionKeysByWallet();

  const [existingAuctionView, setAuctionView] =
    useState<AuctionView | undefined>(undefined);
  const walletPubkey = publicKey?.toBase58();
  const {
    auctions,
    auctionManagersByAuction,
    safetyDepositBoxesByVaultAndIndex,
    metadataByMint,
    bidderMetadataByAuctionAndBidder,
    bidderPotsByAuctionAndBidder,
    masterEditions,
    vaults,
    safetyDepositConfigsByAuctionManagerAndIndex,
    masterEditionsByOneTimeAuthMint,
    masterEditionsByPrintingMint,
    metadataByMasterEdition,

    bidRedemptionV2sByAuctionManagerAndWinningIndex,
  } = useMeta();

  useEffect(() => {
    const auction = auctions[id];
    if (auction) {
      const auctionView = processAccountsIntoAuctionView(
        walletPubkey,
        auction,
        auctionManagersByAuction,
        safetyDepositBoxesByVaultAndIndex,
        metadataByMint,
        bidderMetadataByAuctionAndBidder,
        bidderPotsByAuctionAndBidder,

        bidRedemptionV2sByAuctionManagerAndWinningIndex,
        masterEditions,
        vaults,
        safetyDepositConfigsByAuctionManagerAndIndex,
        masterEditionsByPrintingMint,
        masterEditionsByOneTimeAuthMint,
        metadataByMasterEdition,
        cachedRedemptionKeys,
        undefined,
        existingAuctionView || undefined,
      );
      if (auctionView) setAuctionView(auctionView);
    }
  }, [
    auctions,
    walletPubkey,
    auctionManagersByAuction,
    safetyDepositBoxesByVaultAndIndex,
    metadataByMint,
    bidderMetadataByAuctionAndBidder,
    bidderPotsByAuctionAndBidder,
    bidRedemptionV2sByAuctionManagerAndWinningIndex,
    vaults,
    safetyDepositConfigsByAuctionManagerAndIndex,
    masterEditions,
    masterEditionsByPrintingMint,
    masterEditionsByOneTimeAuthMint,
    metadataByMasterEdition,
    cachedRedemptionKeys,
  ]);
  return existingAuctionView;
};
