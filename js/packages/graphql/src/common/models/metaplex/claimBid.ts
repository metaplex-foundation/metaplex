import { SYSVAR_CLOCK_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh';

import { SCHEMA } from './schema';
import { ClaimBidArgs } from './ClaimBidArgs';
import { getAuctionKeys } from './getAuctionKeys';
import { getBidderPotKey } from '../auctions';
import { programIds, StringPublicKey, toPublicKey } from '../../utils';

export async function claimBid(
  acceptPayment: StringPublicKey,
  bidder: StringPublicKey,
  bidderPotToken: StringPublicKey,
  vault: StringPublicKey,
  tokenMint: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const bidderPotKey = await getBidderPotKey({
    auctionProgramId: PROGRAM_IDS.auction,
    auctionKey,
    bidderPubkey: bidder,
  });

  const value = new ClaimBidArgs();
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(acceptPayment),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotToken),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotKey),
      isSigner: false,
      isWritable: true,
    },

    {
      pubkey: toPublicKey(auctionManagerKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(bidder),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(tokenMint),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.auction),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.token,
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    }),
  );
}
