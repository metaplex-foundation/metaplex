import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  setAuctionAuthority,
  setVaultAuthority,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

// This command sets the authorities on the vault and auction to be the newly created auction manager.
export async function setVaultAndAuctionAuthorities(
  wallet: WalletSigner,
  vault: PublicKey,
  auction: PublicKey,
  auctionManager: PublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  await setAuctionAuthority(
    auction,
    wallet.publicKey,
    auctionManager,
    instructions,
  );
  await setVaultAuthority(
    vault,
    wallet.publicKey,
    auctionManager,
    instructions,
  );

  return { instructions, signers };
}
