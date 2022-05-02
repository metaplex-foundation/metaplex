import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { StringPublicKey, toPublicKey, WalletSigner } from '@oyster/common';
import { createTokenAccount } from '@oyster/common/dist/lib/actions/account';
import {
  activateVault,
  combineVault,
} from '@oyster/common/dist/lib/actions/vault';
import { approve } from '@oyster/common/dist/lib/models/account';

import { AccountLayout } from '@solana/spl-token';
import BN from 'bn.js';

// This command "closes" the vault, by activating & combining it in one go, handing it over to the auction manager
// authority (that may or may not exist yet.)
export async function closeVault(
  connection: Connection,
  wallet: WalletSigner,
  vault: StringPublicKey,
  fractionMint: StringPublicKey,
  fractionTreasury: StringPublicKey,
  redeemTreasury: StringPublicKey,
  priceMint: StringPublicKey,
  externalPriceAccount: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );
  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  await activateVault(
    new BN(0),
    vault,
    fractionMint,
    fractionTreasury,
    wallet.publicKey.toBase58(),
    instructions,
  );

  const outstandingShareAccount = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(fractionMint),
    wallet.publicKey,
    signers,
  );

  const payingTokenAccount = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(priceMint),
    wallet.publicKey,
    signers,
  );

  const transferAuthority = Keypair.generate();

  // Shouldn't need to pay anything since we activated vault with 0 shares, but we still
  // need this setup anyway.
  approve(
    instructions,
    [],
    payingTokenAccount,
    wallet.publicKey,
    0,
    false,
    undefined,
    transferAuthority,
  );

  approve(
    instructions,
    [],
    outstandingShareAccount,
    wallet.publicKey,
    0,
    false,
    undefined,
    transferAuthority,
  );

  signers.push(transferAuthority);

  await combineVault(
    vault,
    outstandingShareAccount.toBase58(),
    payingTokenAccount.toBase58(),
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    transferAuthority.publicKey.toBase58(),
    externalPriceAccount,
    instructions,
  );

  return { instructions, signers };
}
