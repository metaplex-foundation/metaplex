import { SYSVAR_CLOCK_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import { findProgramAddress, StringPublicKey, toPublicKey } from '../../utils';
import { StartAuctionArgs } from './auction';
import { AUCTION_SCHEMA } from './schema';
import { AUCTION_PREFIX } from './constants';

export async function startAuctionWithResource(
  resource: StringPublicKey,
  creator: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(
    serialize(
      AUCTION_SCHEMA,
      new StartAuctionArgs({
        resource,
      }),
    ),
  );

  const auctionKey: StringPublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(auctionProgramId).toBuffer(),
        toPublicKey(resource).toBuffer(),
      ],
      toPublicKey(auctionProgramId),
    )
  )[0];

  const keys = [
    {
      pubkey: toPublicKey(creator),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
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
