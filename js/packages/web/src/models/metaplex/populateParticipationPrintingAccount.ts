import {
  programIds,
  VAULT_PREFIX,
  getAuctionExtended,
  findProgramAddress,
} from '@oyster/common';
import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { PopulateParticipationPrintingAccountArgs, SCHEMA } from '.';

export async function populateParticipationPrintingAccount(
  vault: PublicKey,
  auctionManager: PublicKey,
  auction: PublicKey,
  safetyDepositTokenStore: PublicKey,
  transientOneTimeAccount: PublicKey,
  printingTokenAccount: PublicKey,
  safetyDeposit: PublicKey,
  fractionMint: PublicKey,
  printingMint: PublicKey,
  oneTimePrintingAuthorizationMint: PublicKey,
  masterEdition: PublicKey,
  metadata: PublicKey,
  payer: PublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const transferAuthority: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        PROGRAM_IDS.vault.toBuffer(),
        vault.toBuffer(),
      ],
      PROGRAM_IDS.vault,
    )
  )[0];

  const value = new PopulateParticipationPrintingAccountArgs();
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: safetyDepositTokenStore,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: transientOneTimeAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: printingTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: oneTimePrintingAuthorizationMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: printingMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: safetyDeposit,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: auction,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: await getAuctionExtended({
        auctionProgramId: PROGRAM_IDS.auction,
        resource: vault,
      }),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: auctionManager,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.token,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.vault,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.metadata,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: masterEdition,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: metadata,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: transferAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: payer,
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
