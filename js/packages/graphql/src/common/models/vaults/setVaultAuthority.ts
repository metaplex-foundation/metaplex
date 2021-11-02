import { TransactionInstruction } from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { StringPublicKey, toPublicKey } from '../../utils';

export async function setVaultAuthority(
  vault: StringPublicKey,
  currentAuthority: StringPublicKey,
  newAuthority: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const data = Buffer.from([10]);

  const keys = [
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(currentAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(newAuthority),
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(vaultProgramId),
      data: data,
    }),
  );
}
