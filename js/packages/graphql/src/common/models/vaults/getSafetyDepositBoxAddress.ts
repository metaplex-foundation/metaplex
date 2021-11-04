import { programIds } from '../../utils/programIds';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { VAULT_PREFIX } from './constants';

export async function getSafetyDepositBoxAddress(
  vault: StringPublicKey,
  tokenMint: StringPublicKey,
): Promise<StringPublicKey> {
  const PROGRAM_IDS = programIds();
  return (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(vault).toBuffer(),
        toPublicKey(tokenMint).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.vault),
    )
  )[0];
}
