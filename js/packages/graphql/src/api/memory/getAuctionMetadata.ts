import {
  MetaplexKey,
  MetaState,
  ParsedAccount,
  SafetyDepositBox,
  buildListWhileNonZero,
  WinningConstraint,
  NonWinningConstraint,
  AuctionManagerV1,
} from "../../common";
import { Auction, AuctionManager } from "../../types/sourceTypes";
import { listWrapPubkey } from "../../utils/mapInfo";

export function getAuctionMetadata(auction: Auction, state: MetaState) {
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
}

export const getSafetyDepositConfig = (
  manager: AuctionManager,
  state: MetaState
) => {
  const { safetyDepositConfigsByAuctionManagerAndIndex } = state;
  const configs = buildListWhileNonZero(
    safetyDepositConfigsByAuctionManagerAndIndex,
    manager.pubkey
  );
  return listWrapPubkey(configs);
};

export const getParticipationConfig = (
  manager: AuctionManager,
  state: MetaState
) => {
  if (manager.key === MetaplexKey.AuctionManagerV2) {
    const safetyDepositConfigs = getSafetyDepositConfig(manager, state);
    return (
      safetyDepositConfigs
        .filter((s) => s.participationConfig)
        .map((s) => ({
          winnerConstraint:
            s.participationConfig?.winnerConstraint ||
            WinningConstraint.NoParticipationPrize,
          nonWinningConstraint:
            s.participationConfig?.nonWinningConstraint ||
            NonWinningConstraint.GivenForFixedPrice,
          fixedPrice: s.participationConfig?.fixedPrice || null,
          safetyDepositBoxIndex: s.order.toNumber(),
        }))[0] || null
    );
  }
  return (manager as AuctionManagerV1).settings.participationConfig || null;
};
