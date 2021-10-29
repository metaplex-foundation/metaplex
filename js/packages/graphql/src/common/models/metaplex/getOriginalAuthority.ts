import { findProgramAddress, programIds, toPublicKey } from "../../utils";
import { METAPLEX_PREFIX } from "./constants";

export async function getOriginalAuthority(
  auctionKey: string,
  metadata: string
): Promise<string> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(METAPLEX_PREFIX),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(metadata).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metaplex)
    )
  )[0];
}
