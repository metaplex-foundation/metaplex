import {
  MetaplexKey,
  MetaState,
  ParsedAccount,
  SafetyDepositBox,
} from "../../common";
import { Auction } from "types/sourceTypes";

// auction

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
