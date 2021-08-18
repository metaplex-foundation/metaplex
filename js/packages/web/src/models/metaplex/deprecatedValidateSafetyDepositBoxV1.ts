import { programIds, StringPublicKey, toPublicKey } from '@oyster/common';
import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { getAuctionKeys, getOriginalAuthority, SCHEMA } from '.';

import {
  getSafetyDepositBoxValidationTicket,
  DeprecatedValidateSafetyDepositBoxV1Args,
} from './deprecatedStates';

export async function deprecatedValidateSafetyDepositBoxV1(
  vault: StringPublicKey,
  metadata: StringPublicKey,
  safetyDepositBox: StringPublicKey,
  safetyDepositTokenStore: StringPublicKey,
  tokenMint: StringPublicKey,
  auctionManagerAuthority: StringPublicKey,
  metadataAuthority: StringPublicKey,
  payer: StringPublicKey,
  instructions: TransactionInstruction[],
  edition: StringPublicKey,
  whitelistedCreator: StringPublicKey | undefined,
  store: StringPublicKey,
  printingMint?: StringPublicKey,
  printingMintAuthority?: StringPublicKey,
) {
  const PROGRAM_IDS = programIds();

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const originalAuthorityLookup = await getOriginalAuthority(
    auctionKey,
    metadata,
  );

  const value = new DeprecatedValidateSafetyDepositBoxV1Args();

  const data = Buffer.from(serialize(SCHEMA, value));
  const keys = [
    {
      pubkey: toPublicKey(
        await getSafetyDepositBoxValidationTicket(
          auctionManagerKey,
          safetyDepositBox,
        ),
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionManagerKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(metadata),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(originalAuthorityLookup),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(whitelistedCreator || SystemProgram.programId),
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
      pubkey: toPublicKey(safetyDepositTokenStore),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(tokenMint),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(edition),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(auctionManagerAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(metadataAuthority),
      isSigner: true,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.metadata),
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
      pubkey: toPublicKey(printingMint),
      isSigner: false,
      isWritable: true,
    });

    keys.push({
      pubkey: toPublicKey(printingMintAuthority),
      isSigner: true,
      isWritable: false,
    });
  }
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    }),
  );
}
