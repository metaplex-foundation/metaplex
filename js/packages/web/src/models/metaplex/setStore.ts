import { programIds } from '@oyster/common';
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { SCHEMA, SetStoreArgs } from '.';

export async function setStore(
  isPublic: boolean,
  admin: PublicKey,
  payer: PublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  const value = new SetStoreArgs({ public: isPublic });
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: PROGRAM_IDS.store,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: admin,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    { pubkey: PROGRAM_IDS.token, isSigner: false, isWritable: false },
    { pubkey: PROGRAM_IDS.vault, isSigner: false, isWritable: false },
    { pubkey: PROGRAM_IDS.metadata, isSigner: false, isWritable: false },
    { pubkey: PROGRAM_IDS.auction, isSigner: false, isWritable: false },
    {
      pubkey: PROGRAM_IDS.system,
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
      programId: PROGRAM_IDS.metaplex,
      data,
    }),
  );
}
