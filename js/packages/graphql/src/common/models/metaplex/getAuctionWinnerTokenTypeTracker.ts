import { findProgramAddress, programIds, toPublicKey } from "../../utils";
import { METAPLEX_PREFIX, TOTALS } from "./index";

export async function getAuctionWinnerTokenTypeTracker(auctionManager: string) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error("Store not initialized");
  }

  return (
    await findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(PROGRAM_IDS.metaplex).toBuffer(),
        toPublicKey(auctionManager).toBuffer(),
        Buffer.from(TOTALS),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0];
}
