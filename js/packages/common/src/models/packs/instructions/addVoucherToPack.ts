import {
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { TokenAccount } from '../..';
import {
  AddVoucherToPackArgs,
  getEdition,
  getMetadata,
  PACKS_SCHEMA,
} from '../../..';
import { StringPublicKey, programIds, toPublicKey } from '../../../utils';
import { findPackVoucherProgramAddress } from '../find';

interface Params {
  index: number;
  packSetKey: PublicKey;
  authority: StringPublicKey;
  mint: StringPublicKey;
  tokenAccount: TokenAccount;
}

export async function addVoucherToPack({
  index,
  packSetKey,
  authority,
  mint,
  tokenAccount,
}: Params): Promise<TransactionInstruction> {
  const PROGRAM_IDS = programIds();

  const value = new AddVoucherToPackArgs();

  const masterMetadataKey = await getMetadata(mint);
  const masterEdition = await getEdition(mint);
  const packVoucher = await findPackVoucherProgramAddress(packSetKey, index);
  const { pubkey: sourceKey } = tokenAccount;

  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const data = Buffer.from(serialize(PACKS_SCHEMA, value));
  const keys = [
    // pack_set
    {
      pubkey: toPublicKey(packSetKey),
      isSigner: false,
      isWritable: true,
    },
    // pack_voucher
    {
      pubkey: toPublicKey(packVoucher),
      isSigner: false,
      isWritable: true,
    },
    // signer authority
    {
      pubkey: toPublicKey(authority),
      isSigner: true,
      isWritable: true,
    },
    // voucher_owner
    {
      pubkey: toPublicKey(authority),
      isSigner: true,
      isWritable: false,
    },
    // master_edition
    {
      pubkey: toPublicKey(masterEdition),
      isSigner: false,
      isWritable: false,
    },
    // master_metadata
    {
      pubkey: toPublicKey(masterMetadataKey),
      isSigner: false,
      isWritable: false,
    },
    // mint
    {
      pubkey: toPublicKey(mint),
      isSigner: false,
      isWritable: false,
    },
    // source
    {
      pubkey: toPublicKey(sourceKey),
      isSigner: false,
      isWritable: true,
    },
    // store
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    // rent
    {
      pubkey: toPublicKey(SYSVAR_RENT_PUBKEY),
      isSigner: false,
      isWritable: false,
    },
    // system_program
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    // spl_token program
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];

  return new TransactionInstruction({
    keys,
    programId: toPublicKey(PROGRAM_IDS.pack_create),
    data,
  });
}
