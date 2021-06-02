import {
  Keypair,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { utils, actions, createMint } from '@oyster/common';

import { AccountLayout, MintLayout } from '@solana/spl-token';
const { createTokenAccount, initVault, MAX_VAULT_SIZE, VAULT_PREFIX } = actions;

// This command creates the external pricing oracle a vault
// This gets the vault ready for adding the tokens.
export async function createVault(
  connection: Connection,
  wallet: any,
  priceMint: PublicKey,
  externalPriceAccount: PublicKey,
): Promise<{
  vault: PublicKey;
  fractionalMint: PublicKey;
  redeemTreasury: PublicKey;
  fractionTreasury: PublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  const PROGRAM_IDS = utils.programIds();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const mintRentExempt = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span,
  );

  const vaultRentExempt = await connection.getMinimumBalanceForRentExemption(
    MAX_VAULT_SIZE,
  );

  let vault = Keypair.generate();

  const vaultAuthority = (
    await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_PREFIX), PROGRAM_IDS.vault.toBuffer()],
      PROGRAM_IDS.vault,
    )
  )[0];

  const fractionalMint = createMint(
    instructions,
    wallet.publicKey,
    mintRentExempt,
    0,
    vaultAuthority,
    vaultAuthority,
    signers,
  );

  const redeemTreasury = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    priceMint,
    vaultAuthority,
    signers,
  );

  const fractionTreasury = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    fractionalMint,
    vaultAuthority,
    signers,
  );

  const uninitializedVault = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: vault.publicKey,
    lamports: vaultRentExempt,
    space: MAX_VAULT_SIZE,
    programId: PROGRAM_IDS.vault,
  });
  instructions.push(uninitializedVault);
  signers.push(vault);

  await initVault(
    true,
    fractionalMint,
    redeemTreasury,
    fractionTreasury,
    vault.publicKey,
    wallet.publicKey,
    externalPriceAccount,
    instructions,
  );

  return {
    vault: vault.publicKey,
    fractionalMint,
    redeemTreasury,
    fractionTreasury,
    signers,
    instructions,
  };
}
