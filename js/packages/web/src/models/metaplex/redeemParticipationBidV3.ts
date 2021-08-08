import {
  getEdition,
  programIds,
  getMetadata,
  findProgramAddress,
  VAULT_PREFIX,
  getEditionMarkPda,
  getAuctionExtended,
} from '@oyster/common';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { serialize } from 'borsh';

import {
  getAuctionKeys,
  getBidderKeys,
  RedeemParticipationBidV3Args,
  SCHEMA,
  getPrizeTrackingTicket,
  getSafetyDepositConfig,
} from '.';

export async function redeemParticipationBidV3(
  vault: PublicKey,
  safetyDepositTokenStore: PublicKey,
  destination: PublicKey,
  safetyDeposit: PublicKey,
  bidder: PublicKey,
  payer: PublicKey,
  metadata: PublicKey,
  masterEdition: PublicKey,
  originalMint: PublicKey,
  transferAuthority: PublicKey,
  acceptPaymentAccount: PublicKey,
  tokenPaymentAccount: PublicKey,
  newMint: PublicKey,
  edition: BN,
  winIndex: BN | null,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);
  const auctionDataExtended = await getAuctionExtended({
    auctionProgramId: PROGRAM_IDS.auction,
    resource: vault,
  });

  const { bidRedemption, bidMetadata } = await getBidderKeys(
    auctionKey,
    bidder,
  );

  const prizeTrackingTicket = await getPrizeTrackingTicket(
    auctionManagerKey,
    originalMint,
  );

  const newMetadata = await getMetadata(newMint);
  const newEdition = await getEdition(newMint);

  const editionMarkPda = await getEditionMarkPda(originalMint, edition);

  const safetyDepositConfig = await getSafetyDepositConfig(
    auctionManagerKey,
    safetyDeposit,
  );

  const value = new RedeemParticipationBidV3Args({ winIndex });
  const data = Buffer.from(serialize(SCHEMA, value));
  const keys = [
    {
      pubkey: auctionManagerKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: safetyDepositTokenStore,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: destination,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: bidRedemption,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: safetyDeposit,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: safetyDepositConfig,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: auctionKey,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: bidMetadata,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: bidder,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
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
      pubkey: transferAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: acceptPaymentAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: tokenPaymentAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: prizeTrackingTicket,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: newMetadata,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: newEdition,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: masterEdition,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: newMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: editionMarkPda,
      isSigner: false,
      isWritable: true,
    },
    {
      // Mint authority (this) is going to be the payer since the bidder
      // may not be signer hre - we may be redeeming for someone else (permissionless)
      // and during the txn, mint authority is removed from us and given to master edition.
      // The ATA account is already owned by bidder by default. No signing needed
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: metadata,
      isSigner: false,
      isWritable: false,
    },

    { pubkey: auctionDataExtended, isSigner: false, isWritable: false },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: PROGRAM_IDS.metaplex,
      data,
    }),
  );
}
