import { TransactionInstruction } from '@solana/web3.js';
import { programIds } from '../../utils/programIds';
import { serialize } from 'borsh';
import { StringPublicKey, toPublicKey } from '../../utils';
import { SetAuthorityArgs } from './auction';
import { AUCTION_SCHEMA } from './schema';

export async function setAuctionAuthority(
  auction: StringPublicKey,
  currentAuthority: StringPublicKey,
  newAuthority: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const auctionProgramId = programIds().auction;

  const data = Buffer.from(serialize(AUCTION_SCHEMA, new SetAuthorityArgs()));

  const keys = [
    {
      pubkey: toPublicKey(auction),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(currentAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(newAuthority),
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
