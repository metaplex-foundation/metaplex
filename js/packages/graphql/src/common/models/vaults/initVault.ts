import { SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import { StringPublicKey, toPublicKey } from '../../utils';
import { InitVaultArgs } from './entities/InitVaultArgs';
import { VAULT_SCHEMA } from './schema';

export async function initVault(
  allowFurtherShareCreation: boolean,
  fractionalMint: StringPublicKey,
  redeemTreasury: StringPublicKey,
  fractionalTreasury: StringPublicKey,
  vault: StringPublicKey,
  vaultAuthority: StringPublicKey,
  pricingLookupAddress: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const data = Buffer.from(
    serialize(VAULT_SCHEMA, new InitVaultArgs({ allowFurtherShareCreation })),
  );

  const keys = [
    {
      pubkey: toPublicKey(fractionalMint),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(redeemTreasury),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionalTreasury),
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
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(pricingLookupAddress),
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
      data: data,
    }),
  );
}
