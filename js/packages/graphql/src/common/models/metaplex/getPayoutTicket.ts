import { findProgramAddress, programIds, toPublicKey } from "../../utils";
import { METAPLEX_PREFIX } from "./constants";

export async function getPayoutTicket(
  auctionManager: string,
  winnerConfigIndex: number | null | undefined,
  winnerConfigItemIndex: number | null | undefined,
  creatorIndex: number | null | undefined,
  safetyDepositBox: string,
  recipient: string
) {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(auctionManager).toBuffer(),
        Buffer.from(
          winnerConfigIndex !== null && winnerConfigIndex !== undefined
            ? winnerConfigIndex.toString()
            : "participation"
        ),
        Buffer.from(
          winnerConfigItemIndex !== null && winnerConfigItemIndex !== undefined
            ? winnerConfigItemIndex.toString()
            : "0"
        ),
        Buffer.from(
          creatorIndex !== null && creatorIndex !== undefined
            ? creatorIndex.toString()
            : "auctioneer"
        ),
        toPublicKey(safetyDepositBox).toBuffer(),
        toPublicKey(recipient).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0];
}
