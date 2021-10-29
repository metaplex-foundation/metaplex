import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { getAuctionExtended } from './getAuctionExtended';
import { CreateAuctionArgs } from './auction';
import { AUCTION_SCHEMA } from './schema';
import { AUCTION_PREFIX } from './constants';

export async function createAuction(
  settings: CreateAuctionArgs,
  creator: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(serialize(AUCTION_SCHEMA, settings));

  const auctionKey: StringPublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(settings.resource).toBuffer(),
      ],
      toPublicKey(auctionProgramId),
    )
  )[0];

  const keys = [
    {
      pubkey: toPublicKey(creator),
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(
        await getAuctionExtended({
          auctionProgramId,
          resource: settings.resource,
        }),
      ),
      isSigner: false,
      isWritable: true,
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
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(auctionProgramId),
      data,
    }),
  );
}
