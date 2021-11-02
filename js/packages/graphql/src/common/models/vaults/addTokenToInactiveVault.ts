import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import BN from 'bn.js';
import { StringPublicKey, toPublicKey } from '../../utils';
import { AmountArgs } from './entities/AmountArgs';
import { VAULT_SCHEMA } from './schema';
import { getSafetyDepositBox } from './getSafetyDepositBox';

export async function addTokenToInactiveVault(
  amount: BN,
  tokenMint: StringPublicKey,
  tokenAccount: StringPublicKey,
  tokenStoreAccount: StringPublicKey,
  vault: StringPublicKey,
  vaultAuthority: StringPublicKey,
  payer: StringPublicKey,
  transferAuthority: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;
  const safetyDepositBox = await getSafetyDepositBox(vault, tokenMint);

  const value = new AmountArgs({
    instruction: 1,
    amount,
  });

  const data = Buffer.from(serialize(VAULT_SCHEMA, value));
  const keys = [
    {
      pubkey: toPublicKey(safetyDepositBox),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(tokenAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(tokenStoreAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vaultAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(transferAuthority),
      isSigner: true,
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
    {
      pubkey: SystemProgram.programId,
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
