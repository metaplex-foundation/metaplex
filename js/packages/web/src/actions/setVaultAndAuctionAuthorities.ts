import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  setAuctionAuthority,
  setVaultAuthority,
  StringPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// This command sets the authorities on the vault and auction to be the newly created auction manager.
export async function setVaultAndAuctionAuthorities(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  await setAuctionAuthority(
    auction,
    wallet.publicKey.toBase58(),
    auctionManager,
    instructions,
  );
  await setVaultAuthority(
    vault,
    wallet.publicKey.toBase58(),
    auctionManager,
    instructions,
  );

  return { instructions, signers };
}
