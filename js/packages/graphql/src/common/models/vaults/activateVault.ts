import { TransactionInstruction } from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import BN from 'bn.js';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { VAULT_PREFIX } from './constants';
import { NumberOfShareArgs } from './entities/NumberOfShareArgs';
import { VAULT_SCHEMA } from './schema';

export async function activateVault(
  numberOfShares: BN,
  vault: StringPublicKey,
  fractionMint: StringPublicKey,
  fractionTreasury: StringPublicKey,
  vaultAuthority: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const fractionMintAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(vaultProgramId).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(vaultProgramId),
    )
  )[0];

  const value = new NumberOfShareArgs({ instruction: 2, numberOfShares });
  const data = Buffer.from(serialize(VAULT_SCHEMA, value));

  const keys = [
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
      pubkey: toPublicKey(fractionTreasury),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionMintAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vaultAuthority),
      isSigner: true,
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
