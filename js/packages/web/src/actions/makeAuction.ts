import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  utils,
  actions,
  findProgramAddress,
  IPartialCreateAuctionArgs,
  CreateAuctionArgs,
} from '@oyster/common';

import { METAPLEX_PREFIX } from '../models/metaplex';
const { AUCTION_PREFIX, createAuction } = actions;

// This command makes an auction
export async function makeAuction(
  wallet: any,
  vault: PublicKey,
  auctionSettings: IPartialCreateAuctionArgs,
): Promise<{
  auction: PublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  const PROGRAM_IDS = utils.programIds();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const auctionKey: PublicKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        PROGRAM_IDS.auction.toBuffer(),
        vault.toBuffer(),
      ],
      PROGRAM_IDS.auction,
    )
  )[0];

  const auctionManagerKey: PublicKey = (
    await findProgramAddress(
      [Buffer.from(METAPLEX_PREFIX), auctionKey.toBuffer()],
      PROGRAM_IDS.metaplex,
    )
  )[0];

  const fullSettings = new CreateAuctionArgs({
    ...auctionSettings,
    authority: auctionManagerKey,
    resource: vault,
  });

  createAuction(fullSettings, wallet.publicKey, instructions);

  return { instructions, signers, auction: auctionKey };
}
