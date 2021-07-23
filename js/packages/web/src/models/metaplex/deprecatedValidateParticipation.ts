import { programIds } from '@oyster/common';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { SCHEMA, DeprecatedValidateParticipationArgs } from '.';

export async function deprecatedValidateParticipation(
  auctionManager: PublicKey,
  openEditionMetadata: PublicKey,
  openEditionMasterAccount: PublicKey,
  printingAuthorizationHoldingAccount: PublicKey,
  auctionManagerAuthority: PublicKey,
  whitelistedCreatorEntry: PublicKey | undefined,
  store: PublicKey,
  safetyDepositBox: PublicKey,
  safetyDepositBoxTokenStore: PublicKey,
  vault: PublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  const value = new DeprecatedValidateParticipationArgs();

  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: auctionManager,
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: openEditionMetadata,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: openEditionMasterAccount,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: printingAuthorizationHoldingAccount,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: auctionManagerAuthority,
      isSigner: true,
      isWritable: false,
    },

    {
      pubkey: whitelistedCreatorEntry || SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: safetyDepositBox,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: safetyDepositBoxTokenStore,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault,
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
