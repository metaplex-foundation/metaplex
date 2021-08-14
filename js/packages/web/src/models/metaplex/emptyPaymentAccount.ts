import { programIds } from '@oyster/common';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import {
  EmptyPaymentAccountArgs,
  getAuctionWinnerTokenTypeTracker,
  getPayoutTicket,
  getSafetyDepositConfig,
  SCHEMA,
} from '.';

export async function emptyPaymentAccount(
  acceptPayment: PublicKey,
  destination: PublicKey,
  auctionManager: PublicKey,
  metadata: PublicKey,
  masterEdition: PublicKey | undefined,
  safetyDepositBox: PublicKey,
  vault: PublicKey,
  auction: PublicKey,
  payer: PublicKey,
  recipient: PublicKey,
  winningConfigIndex: number | null,
  winningConfigItemIndex: number | null,
  creatorIndex: number | null,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const safetyDepositConfig = await getSafetyDepositConfig(
    auctionManager,
    safetyDepositBox,
  );

  const tokenTracker = await getAuctionWinnerTokenTypeTracker(auctionManager);

  const value = new EmptyPaymentAccountArgs({
    winningConfigIndex,
    winningConfigItemIndex,
    creatorIndex,
  });

  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: acceptPayment,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: destination,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionManager,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: await getPayoutTicket(
        auctionManager,
        winningConfigIndex,
        winningConfigItemIndex,
        creatorIndex,
        safetyDepositBox,
        recipient,
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: metadata,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: masterEdition || SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: safetyDepositBox,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: auction,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.token,
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

    {
      pubkey: tokenTracker,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: safetyDepositConfig,
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
