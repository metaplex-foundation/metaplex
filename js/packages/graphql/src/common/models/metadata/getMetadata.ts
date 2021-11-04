import {
  findProgramAddress,
  StringPublicKey,
  toPublicKey,
  programIds,
} from '../../utils';
import { METADATA_PREFIX } from './constants';

export async function getMetadata(
  tokenMint: StringPublicKey,
): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();

  return (
    await findProgramAddress(
      [
        Buffer.from(METADATA_PREFIX),
        toPublicKey(PROGRAM_IDS.metadata).toBuffer(),
        toPublicKey(tokenMint).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.metadata),
    )
  )[0];
}
