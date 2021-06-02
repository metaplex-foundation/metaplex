import { programIds } from '@oyster/common';
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { getAuctionKeys, SCHEMA, StartAuctionArgs } from '.';

export async function startAuction(
  vault: PublicKey,
  auctionManagerAuthority: PublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const value = new StartAuctionArgs();
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: auctionManagerKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionManagerAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.store,
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
