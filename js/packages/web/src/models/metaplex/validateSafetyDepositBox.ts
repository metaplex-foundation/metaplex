import { programIds, getEdition } from '@oyster/common';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import {
  getAuctionKeys,
  getOriginalAuthority,
  getSafetyDepositBoxValidationTicket,
  SCHEMA,
  ValidateSafetyDepositBoxArgs,
} from '.';

export async function validateSafetyDepositBox(
  vault: PublicKey,
  metadata: PublicKey,
  safetyDepositBox: PublicKey,
  safetyDepositTokenStore: PublicKey,
  tokenMint: PublicKey,
  auctionManagerAuthority: PublicKey,
  metadataAuthority: PublicKey,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  edition: PublicKey,
  whitelistedCreator: PublicKey | undefined,
  store: PublicKey,
  printingMint?: PublicKey,
  printingMintAuthority?: PublicKey,
) {
  const PROGRAM_IDS = programIds();

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const originalAuthorityLookup: PublicKey = await getOriginalAuthority(
    auctionKey,
    metadata,
  );

  const value = new ValidateSafetyDepositBoxArgs();

  const data = Buffer.from(serialize(SCHEMA, value));
  const keys = [
    {
      pubkey: await getSafetyDepositBoxValidationTicket(
        auctionManagerKey,
        safetyDepositBox,
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionManagerKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: metadata,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: originalAuthorityLookup,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: whitelistedCreator || SystemProgram.programId,
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
      pubkey: safetyDepositTokenStore,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: tokenMint,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: edition,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: auctionManagerAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: metadataAuthority,
      isSigner: true,
      isWritable: false,
    },

    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.metadata,
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

  if (printingMint && printingMintAuthority) {
    keys.push({
      pubkey: printingMint,
      isSigner: false,
      isWritable: true,
    });

    keys.push({
      pubkey: printingMintAuthority,
      isSigner: true,
      isWritable: false,
    });
  }
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: PROGRAM_IDS.metaplex,
      data,
    }),
  );
}
