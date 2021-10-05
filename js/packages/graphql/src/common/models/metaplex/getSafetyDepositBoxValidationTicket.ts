import { findProgramAddress, programIds, toPublicKey } from "../../utils";
import { METAPLEX_PREFIX } from "./constants";

export async function getSafetyDepositBoxValidationTicket(
  auctionManager: string,
  safetyDepositBox: string
) {
  const PROGRAM_IDS = programIds();
  return (
    await findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(PROGRAM_IDS.metaplex).toBuffer(),
        toPublicKey(auctionManager).toBuffer(),
        toPublicKey(safetyDepositBox).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0];
}
