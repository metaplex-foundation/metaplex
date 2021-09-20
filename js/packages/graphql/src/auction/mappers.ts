import {
  AuctionData,
  MetaState,
  ParsedAccount,
  SafetyDepositBox,
  processAccountsIntoAuctionView,
  getAuctionBids,
  MetaplexKey,
} from "../common";

import { mapInfo, wrapPubkey } from "../utils/mapInfo";
import { Auction } from "../types/sourceTypes";
import { SMetaState } from "../api";

export const getAuctionMetadata = (auction: Auction, state: SMetaState) => {
  const vaultId = auction.manager.vault;
  const boxes: ParsedAccount<SafetyDepositBox>[] = [];
  for (const box of state.safetyDepositBoxesByVaultAndIndex.values()) {
    if (box.info.vault === vaultId) {
      boxes.push(box);
    }
  }
  return boxes
    .map((box) => {
      let metadata = state.metadataByMint.get(box.info.tokenMint);
      if (auction.manager.key === MetaplexKey.AuctionManagerV1 && !metadata) {
        // Means is a limited edition v1, so the tokenMint is the printingMint
        const masterEdition = state.masterEditionsByPrintingMint.get(
          box.info.tokenMint
        );
        if (masterEdition) {
          metadata = state.metadataByMasterEdition.get(masterEdition.pubkey);
        }
      }
      return metadata;
    })
    .filter(Boolean);
};

export const getAuctionThumbnail = (auction: Auction, state: SMetaState) => {
  const metadata = getAuctionMetadata(auction, state)[0];
  return metadata ? wrapPubkey(metadata) : null;
};

export const getAuctionHighestBid = (auction: Auction, state: SMetaState) => {
  const bids = getAuctionBids(
    Array.from(state.bidderMetadataByAuctionAndBidder.values()),
    auction.pubkey
  );
  return bids?.[0];
};

export const auctionView = (
  auction: ParsedAccount<AuctionData>,
  state: MetaState
) => {
  const {
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
    safetyDepositConfigsByAuctionManagerAndIndex,
    bidRedemptionV2sByAuctionManagerAndWinningIndex,
  } = state;

  const view = processAccountsIntoAuctionView(
    "",
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
    {} as any,
    undefined
  );
  if (!view) return undefined;

  return {
    auction: wrapPubkey(auction),
    state: view?.state,
    totallyComplete: view.totallyComplete,
    manager: view.auctionManager,
    vault: wrapPubkey(view.vault),
    safetyDepositBoxes: mapInfo(view.safetyDepositBoxes),
    items: view.items,
    participationItem: view.participationItem,
    thumbnail: view.thumbnail,
  };
};
