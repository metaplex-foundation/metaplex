import {
  StringPublicKey,
  loadAuction,
  useConnection,
  loadMetadataAndEditionsBySafetyDepositBoxes,
  loadPrizeTrackingTickets,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { merge } from 'lodash';
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
  const connection = useConnection();

  const [existingAuctionView, setAuctionView] = useState<
    AuctionView | undefined
  >(undefined);
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
    auctionDataExtended,
    isLoading,
    whitelistedCreatorsByCreator,
    patchState,
  } = useMeta();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    (async () => {
      const auctionManager = auctionManagersByAuction[id];
      const auctionState = await loadAuction(connection, auctionManager);

      const metadataState = await loadMetadataAndEditionsBySafetyDepositBoxes(
        connection,
        auctionState.safetyDepositBoxesByVaultAndIndex,
        whitelistedCreatorsByCreator,
      );

      const prizeTrackingTicketState = await loadPrizeTrackingTickets(
        connection,
        auctionManager,
        metadataState.metadata,
      );

      const finalState = merge(
        {},
        prizeTrackingTicketState,
        auctionState,
        metadataState,
      );

      patchState(finalState);
    })();
  }, [isLoading]);

  useEffect(() => {
    (async () => {
      const auction = auctions[id];

      if (auction) {
        const auctionView = processAccountsIntoAuctionView(
          walletPubkey,
          auction,
          auctionDataExtended,
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
    })();
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
