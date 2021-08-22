import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  utils,
  actions,
  findProgramAddress,
  IPartialCreateAuctionArgs,
  CreateAuctionArgs,
  StringPublicKey,
  toPublicKey,
  CreateAuctionArgsV2,
  IPartialCreateAuctionArgsCommon,
} from '@oyster/common';

const { AUCTION_PREFIX, createAuction } = actions;

// This command makes an auction
export async function makeAuction(
  wallet: any,
  vault: StringPublicKey,
  auctionSettings: IPartialCreateAuctionArgsCommon,
): Promise<{
  auction: StringPublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  const PROGRAM_IDS = utils.programIds();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const auctionKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(PROGRAM_IDS.auction).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.auction),
    )
  )[0];

  const fullSettings = auctionSettings.hasOwnProperty('instantSalePrice')
    ? new CreateAuctionArgsV2({
        ...auctionSettings,
        authority: wallet.publicKey.toBase58(),
        resource: vault,
      })
    : new CreateAuctionArgs({
        ...auctionSettings,
        authority: wallet.publicKey.toBase58(),
        resource: vault,
      });

  createAuction(fullSettings, wallet.publicKey.toBase58(), instructions);

  return { instructions, signers, auction: auctionKey };
}
