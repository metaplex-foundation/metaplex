import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  setAuctionAuthority,
  setVaultAuthority,
  StringPublicKey,
} from '@oyster/common';

// This command sets the authorities on the vault and auction to be the newly created auction manager.
export async function setVaultAndAuctionAuthorities(
  wallet: any,
  vault: StringPublicKey,
  auction: StringPublicKey,
  auctionManager: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
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
