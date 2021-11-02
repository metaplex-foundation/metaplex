import { programIds } from '../../utils/programIds';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { VAULT_PREFIX } from './constants';

export async function getSafetyDepositBox(
  vault: StringPublicKey,
  tokenMint: StringPublicKey,
): Promise<StringPublicKey> {
  const vaultProgramId = programIds().vault;

  return (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(vault).toBuffer(),
        toPublicKey(tokenMint).toBuffer(),
      ],
      toPublicKey(vaultProgramId),
    )
  )[0];
}
