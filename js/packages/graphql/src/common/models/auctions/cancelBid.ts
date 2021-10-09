import {
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { CancelBidArgs } from './auction';
import { AUCTION_SCHEMA } from './schema';
import { getBidderPotKey } from './getBidderPotKey';
import { getAuctionExtended } from './getAuctionExtended';
import { AUCTION_PREFIX } from './constants';

export async function cancelBid(
  bidderPubkey: StringPublicKey,
  bidderTokenPubkey: StringPublicKey,
  bidderPotTokenPubkey: StringPublicKey,
  tokenMintPubkey: StringPublicKey,
  resource: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(
    serialize(
      AUCTION_SCHEMA,
      new CancelBidArgs({
        resource,
      }),
    ),
  );

  const auctionKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(resource).toBuffer(),
      ],
      toPublicKey(auctionProgramId),
    )
  )[0];

  const bidderPotKey = await getBidderPotKey({
    auctionProgramId,
    auctionKey,
    bidderPubkey,
  });

  const bidderMetaKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(auctionKey).toBuffer(),
        toPublicKey(bidderPubkey).toBuffer(),
        Buffer.from('metadata'),
      ],
      toPublicKey(auctionProgramId),
    )
  )[0];

  const keys = [
    {
      pubkey: toPublicKey(bidderPubkey),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(bidderTokenPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderPotTokenPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(bidderMetaKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(
        await getAuctionExtended({ auctionProgramId, resource }),
      ),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(tokenMintPubkey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(auctionProgramId),
      data,
    }),
  );
}
