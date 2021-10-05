import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { serialize } from "borsh";

import { getPayoutTicket } from "./getPayoutTicket";
import { getSafetyDepositConfig } from "./getSafetyDepositConfig";
import { EmptyPaymentAccountArgs } from "./EmptyPaymentAccountArgs";
import { getAuctionWinnerTokenTypeTracker } from "./getAuctionWinnerTokenTypeTracker";
import { programIds, StringPublicKey, toPublicKey } from "../../utils";
import { SCHEMA } from "./schema";

export async function emptyPaymentAccount(
  acceptPayment: StringPublicKey,
  destination: StringPublicKey,
  auctionManager: StringPublicKey,
  metadata: StringPublicKey,
  masterEdition: StringPublicKey | undefined,
  safetyDepositBox: StringPublicKey,
  vault: StringPublicKey,
  auction: StringPublicKey,
  payer: StringPublicKey,
  recipient: StringPublicKey,
  winningConfigIndex: number | null,
  winningConfigItemIndex: number | null,
  creatorIndex: number | null,
  instructions: TransactionInstruction[]
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error("Store not initialized");
  }

  const safetyDepositConfig = await getSafetyDepositConfig(
    auctionManager,
    safetyDepositBox
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
      pubkey: toPublicKey(acceptPayment),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(destination),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionManager),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(
        await getPayoutTicket(
          auctionManager,
          winningConfigIndex,
          winningConfigItemIndex,
          creatorIndex,
          safetyDepositBox,
          recipient
        )
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(metadata),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(masterEdition || SystemProgram.programId),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(safetyDepositBox),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(auction),
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
      pubkey: toPublicKey(tokenTracker),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(safetyDepositConfig),
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    })
  );
}
