import {
  TokenAccount,
  useConnection,
  useUserAccounts,
  useWallet,
} from '@oyster/common';
import { PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import {
  AuctionView,
  processAccountsIntoAuctionView,
  useCachedRedemptionKeysByWallet,
} from '.';
import { useMeta } from '../contexts';

export const useAuction = (pubkey: PublicKey | string) => {
  const id = typeof pubkey === 'string' ? pubkey : pubkey.toBase58();

  const { wallet } = useWallet();
  const cachedRedemptionKeys = useCachedRedemptionKeysByWallet();

  const [existingAuctionView, setAuctionView] =
    useState<AuctionView | undefined>(undefined);
  const walletPubkey = wallet?.publicKey;
  const {
    auctions,
    auctionManagersByAuction,
    safetyDepositBoxesByVaultAndIndex,
    metadataByMint,
    bidderMetadataByAuctionAndBidder,
    bidderPotsByAuctionAndBidder,
    masterEditions,
    vaults,
    masterEditionsByOneTimeAuthMint,
    masterEditionsByPrintingMint,
    metadataByMasterEdition,
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
        masterEditions,
        vaults,
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
    vaults,
    masterEditions,
    masterEditionsByPrintingMint,
    masterEditionsByOneTimeAuthMint,
    metadataByMasterEdition,
    cachedRedemptionKeys,
  ]);
  return existingAuctionView;
};
