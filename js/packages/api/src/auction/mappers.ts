import { AuctionData } from '@oyster/common/dist/lib/actions/auction';
import type { MetaState, ParsedAccount } from '@oyster/common';
import {
  processAccountsIntoAuctionView,
  getAuctionBids,
} from '@oyster/common/dist/lib/models/auction';
import { MetaplexKey } from '@oyster/common/dist/lib/models/metaplex/index';
import { mapInfo, wrapPubkey } from '../utils/mapInfo';
import { Auction } from '../sourceTypes';

export const getAuctionMetadata = (auction: Auction, state: MetaState) => {
  const safetyDeposits = Object.values(state.safetyDepositBoxesByVaultAndIndex);

  const vaultId = auction.manager.vault;
  const boxes = safetyDeposits.filter(box => {
    return box.info.vault === vaultId;
  });

  return boxes
    .map(box => {
      let metadata = state.metadataByMint[box.info.tokenMint];
      if (auction.manager.key === MetaplexKey.AuctionManagerV1 && !metadata) {
        // Means is a limited edition v1, so the tokenMint is the printingMint
        const masterEdition =
          state.masterEditionsByPrintingMint[box.info.tokenMint];
        if (masterEdition) {
          metadata = state.metadataByMasterEdition[masterEdition.pubkey];
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
    Object.values(state.bidderMetadataByAuctionAndBidder),
    auction.pubkey,
  );
  return bids?.[0];
};

export const auctionView = (
  auction: ParsedAccount<AuctionData>,
  state: MetaState,
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
    '',
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
    undefined,
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
