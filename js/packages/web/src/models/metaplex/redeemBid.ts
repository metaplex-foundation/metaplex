import { getReservationList, programIds, VAULT_PREFIX } from '@oyster/common';
import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

import { getAuctionKeys, getBidderKeys, RedeemBidArgs, SCHEMA } from '.';

export async function redeemBid(
  vault: PublicKey,
  safetyDepositTokenStore: PublicKey,
  destination: PublicKey,
  safetyDeposit: PublicKey,
  fractionMint: PublicKey,
  bidder: PublicKey,
  payer: PublicKey,
  masterEdition: PublicKey | undefined,
  reservationList: PublicKey | undefined,
  isPrintingType: boolean,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const { bidRedemption, bidMetadata } = await getBidderKeys(
    auctionKey,
    bidder,
  );

  const transferAuthority: PublicKey = (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        PROGRAM_IDS.vault.toBuffer(),
        vault.toBuffer(),
      ],
      PROGRAM_IDS.vault,
    )
  )[0];

  const value = new RedeemBidArgs();
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
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
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
      pubkey: PROGRAM_IDS.store,
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
      isSigner: false,
      isWritable: false,
    },
  ];

  if (isPrintingType && masterEdition && reservationList) {
    keys.push({
      pubkey: masterEdition,
      isSigner: false,
      isWritable: true,
    });
    keys.push({
      pubkey: reservationList,
      isSigner: false,
      isWritable: true,
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
