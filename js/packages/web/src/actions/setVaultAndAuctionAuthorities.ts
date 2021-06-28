import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  utils,
  actions,
  createMint,
  findProgramAddress,
  setAuctionAuthority,
  setVaultAuthority,
} from '@oyster/common';

import { AccountLayout, MintLayout } from '@solana/spl-token';
const { createTokenAccount, initVault, MAX_VAULT_SIZE, VAULT_PREFIX } = actions;

// This command sets the authorities on the vault and auction to be the newly created auction manager.
export async function setVaultAndAuctionAuthorities(
  connection: Connection,
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
    auction,
    wallet.publicKey,
    auctionManager,
    instructions,
  );

  return { instructions, signers };
}
