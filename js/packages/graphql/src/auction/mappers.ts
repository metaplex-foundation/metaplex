import {
  ParsedAccount,
  SafetyDepositBox,
  getAuctionBids,
  MetaplexKey,
  MetaState,
} from "../common";

import { wrapPubkey } from "../utils/mapInfo";
import { Auction } from "../types/sourceTypes";

export const getAuctionMetadata = (auction: Auction, state: MetaState) => {
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

export const getAuctionThumbnail = (auction: Auction, state: MetaState) => {
  const metadata = getAuctionMetadata(auction, state)[0];
  return metadata ? wrapPubkey(metadata) : null;
};

export const getAuctionHighestBid = (auction: Auction, state: MetaState) => {
  const bids = getAuctionBids(
    Array.from(state.bidderMetadataByAuctionAndBidder.values()),
    auction.pubkey
  );
  return bids?.[0];
};
