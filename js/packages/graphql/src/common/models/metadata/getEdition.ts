import { programIds } from '../../utils/programIds';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { EDITION, METADATA_PREFIX } from './constants';

export async function getEdition(
  tokenMint: StringPublicKey,
): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(METADATA_PREFIX),
        toPublicKey(PROGRAM_IDS.metadata).toBuffer(),
        toPublicKey(tokenMint).toBuffer(),
        Buffer.from(EDITION),
      ],
      toPublicKey(PROGRAM_IDS.metadata),
    )
  )[0];
}
