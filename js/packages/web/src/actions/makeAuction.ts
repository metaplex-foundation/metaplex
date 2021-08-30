import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  utils,
  actions,
  findProgramAddress,
  IPartialCreateAuctionArgs,
  CreateAuctionArgs,
  StringPublicKey,
  toPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

const { AUCTION_PREFIX, createAuction } = actions;

// This command makes an auction
export async function makeAuction(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auctionSettings: IPartialCreateAuctionArgs,
): Promise<{
  auction: StringPublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

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

  const fullSettings = new CreateAuctionArgs({
    ...auctionSettings,
    authority: wallet.publicKey.toBase58(),
    resource: vault,
  });

  createAuction(fullSettings, wallet.publicKey.toBase58(), instructions);

  return { instructions, signers, auction: auctionKey };
}
