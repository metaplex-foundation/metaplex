import { findProgramAddress, programIds, toPublicKey } from "../../utils";
import { METAPLEX_PREFIX } from "./constants";

export async function getAuctionManagerKey(
  vault: string,
  auctionKey: string
): Promise<string> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [Buffer.from(METAPLEX_PREFIX), toPublicKey(auctionKey).toBuffer()],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0];
}
