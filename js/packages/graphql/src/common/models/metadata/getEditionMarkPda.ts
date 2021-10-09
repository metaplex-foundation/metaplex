import { programIds } from '../../utils/programIds';
import BN from 'bn.js';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { EDITION, METADATA_PREFIX } from './constants';

export async function getEditionMarkPda(
  mint: StringPublicKey,
  edition: BN,
): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();
  const editionNumber = Math.floor(edition.toNumber() / 248);

  return (
    await findProgramAddress(
      [
        Buffer.from(METADATA_PREFIX),
        toPublicKey(PROGRAM_IDS.metadata).toBuffer(),
        toPublicKey(mint).toBuffer(),
        Buffer.from(EDITION),
        Buffer.from(editionNumber.toString()),
      ],
      toPublicKey(PROGRAM_IDS.metadata),
    )
  )[0];
}
