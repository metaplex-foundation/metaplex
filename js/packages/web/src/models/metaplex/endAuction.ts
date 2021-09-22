import {
  EndAuctionArgs,
  getAuctionExtended,
  getAuctionKeys,
  programIds,
  toPublicKey,
  SCHEMA,
} from '@oyster/common';
import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

export async function endAuction(
  vault: PublicKey,
  auctionManagerAuthority: PublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(
    vault.toString(),
  );
  const auctionExtended = await getAuctionExtended({
    auctionProgramId: PROGRAM_IDS.auction,
    resource: vault.toString(),
  });
  const value = new EndAuctionArgs({ reveal: null });
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(auctionManagerKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionExtended),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(auctionManagerAuthority),
      isSigner: true,
      isWritable: false,
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
      pubkey: toPublicKey(SYSVAR_CLOCK_PUBKEY),
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
