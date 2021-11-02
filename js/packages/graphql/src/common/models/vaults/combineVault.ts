import { TransactionInstruction } from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { VAULT_PREFIX } from './constants';

export async function combineVault(
  vault: StringPublicKey,
  outstandingShareTokenAccount: StringPublicKey,
  payingTokenAccount: StringPublicKey,
  fractionMint: StringPublicKey,
  fractionTreasury: StringPublicKey,
  redeemTreasury: StringPublicKey,
  newVaultAuthority: StringPublicKey | undefined,
  vaultAuthority: StringPublicKey,
  transferAuthority: StringPublicKey,
  externalPriceAccount: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const burnAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(vaultProgramId).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(vaultProgramId),
    )
  )[0];

  const data = Buffer.from([3]);

  const keys = [
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(outstandingShareTokenAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(payingTokenAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionMint),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionTreasury),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(redeemTreasury),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(newVaultAuthority || vaultAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vaultAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(transferAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(burnAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(externalPriceAccount),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(vaultProgramId),
      data,
    }),
  );
}
