import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { setAuctionAuthority, setVaultAuthority } from '@oyster/common';

// This command sets the authorities on the vault and auction to be the newly created auction manager.
export async function setVaultAndAuctionAuthorities(
  wallet: any,
  vault: PublicKey,
  auction: PublicKey,
  auctionManager: PublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
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
