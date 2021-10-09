import { SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import BN from 'bn.js';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { VAULT_PREFIX } from './constants';
import { AmountArgs } from './entities/AmountArgs';
import { VAULT_SCHEMA } from './schema';

export async function withdrawTokenFromSafetyDepositBox(
  amount: BN,
  destination: StringPublicKey,
  safetyDepositBox: StringPublicKey,
  storeKey: StringPublicKey,
  vault: StringPublicKey,
  fractionMint: StringPublicKey,
  vaultAuthority: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const transferAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(vaultProgramId).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(vaultProgramId),
    )
  )[0];

  const value = new AmountArgs({ instruction: 5, amount });
  const data = Buffer.from(serialize(VAULT_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(destination),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(safetyDepositBox),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(storeKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionMint),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vaultAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(transferAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
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
