import { programIds, StringPublicKey, toPublicKey } from '@oyster/common';
import { SYSVAR_CLOCK_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh';

import { DecommissionAuctionManagerArgs, SCHEMA } from '.';

export async function decommissionAuctionManager(
  auctionManager: StringPublicKey,
  auction: StringPublicKey,
  authority: StringPublicKey,
  vault: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const value = new DecommissionAuctionManagerArgs();
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(auctionManager),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auction),
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: toPublicKey(authority),
      isSigner: true,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.auction),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(programIds().vault),
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    }),
  );
}
