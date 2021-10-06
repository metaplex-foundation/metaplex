import BN from "bn.js";
import {
  AuctionManagerV2,
  AuctionManagerV1,
  Vault,
  MetaplexKey,
} from "../../../common";

export function getSafetyDepositBoxesExpected(
  manager: Pick<AuctionManagerV2 | AuctionManagerV1, "state" | "key">,
  vault: Pick<Vault, "tokenTypeCount">
) {
  return manager.key == MetaplexKey.AuctionManagerV2
    ? new BN(vault.tokenTypeCount)
    : new BN((manager as AuctionManagerV1).state.winningConfigItemsValidated);
}
