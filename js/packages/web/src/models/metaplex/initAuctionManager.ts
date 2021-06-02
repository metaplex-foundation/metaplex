import { programIds } from '@oyster/common';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import {
  AuctionManagerSettings,
  getAuctionKeys,
  InitAuctionManagerArgs,
  SCHEMA,
} from '.';

export async function initAuctionManager(
  vault: PublicKey,
  auctionManagerAuthority: PublicKey,
  payer: PublicKey,
  acceptPaymentAccount: PublicKey,
  store: PublicKey,
  settings: AuctionManagerSettings,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const value = new InitAuctionManagerArgs({
    settings,
  });

  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: auctionManagerKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: auctionKey,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: auctionManagerAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: acceptPaymentAccount,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
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
