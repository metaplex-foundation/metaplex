import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { serialize } from "borsh";

import { SCHEMA } from ".";
import { programIds, StringPublicKey, toPublicKey } from "../../utils";
import { DeprecatedValidateParticipationArgs } from "./DeprecatedValidateParticipationArgs";

export async function deprecatedValidateParticipation(
  auctionManager: StringPublicKey,
  openEditionMetadata: StringPublicKey,
  openEditionMasterAccount: StringPublicKey,
  printingAuthorizationHoldingAccount: StringPublicKey,
  auctionManagerAuthority: StringPublicKey,
  whitelistedCreatorEntry: StringPublicKey | undefined,
  store: StringPublicKey,
  safetyDepositBox: StringPublicKey,
  safetyDepositBoxTokenStore: StringPublicKey,
  vault: StringPublicKey,
  instructions: TransactionInstruction[]
) {
  const PROGRAM_IDS = programIds();

  const value = new DeprecatedValidateParticipationArgs();

  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(auctionManager),
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: toPublicKey(openEditionMetadata),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(openEditionMasterAccount),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(printingAuthorizationHoldingAccount),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(auctionManagerAuthority),
      isSigner: true,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(whitelistedCreatorEntry || SystemProgram.programId),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(safetyDepositBox),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(safetyDepositBoxTokenStore),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vault),
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
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    })
  );
}
