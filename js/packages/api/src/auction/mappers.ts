import { AuctionData } from '@oyster/common/dist/lib/actions/auction';
import type { MetaState, ParsedAccount } from '@oyster/common';
import { processAccountsIntoAuctionView } from '@oyster/common/dist/lib/models/auction';
import { mapInfo, wrapPubkey } from '../utils/mapInfo';

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
