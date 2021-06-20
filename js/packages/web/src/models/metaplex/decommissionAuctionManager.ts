import { programIds } from '@oyster/common';
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { DecommissionAuctionManagerArgs, SCHEMA } from '.';

export async function decommissionAuctionManager(
  auctionManager: PublicKey,
  auction: PublicKey,
  authority: PublicKey,
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
      pubkey: auctionManager,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auction,
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: authority,
      isSigner: true,
      isWritable: false,
    },

    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.auction,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
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
