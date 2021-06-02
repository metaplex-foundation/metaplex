import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { utils, actions, models } from '@oyster/common';

import { AccountLayout } from '@solana/spl-token';
import BN from 'bn.js';
import { METAPLEX_PREFIX } from '../models/metaplex';
const {
  createTokenAccount,
  activateVault,
  combineVault,
  VAULT_PREFIX,
  AUCTION_PREFIX,
} = actions;
const { approve } = models;

// This command "closes" the vault, by activating & combining it in one go, handing it over to the auction manager
// authority (that may or may not exist yet.)
export async function closeVault(
  connection: Connection,
  wallet: any,
  vault: PublicKey,
  fractionMint: PublicKey,
  fractionTreasury: PublicKey,
  redeemTreasury: PublicKey,
  priceMint: PublicKey,
  externalPriceAccount: PublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  const PROGRAM_IDS = utils.programIds();

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );
  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  const auctionKey: PublicKey = (
    await PublicKey.findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        PROGRAM_IDS.auction.toBuffer(),
        vault.toBuffer(),
      ],
      PROGRAM_IDS.auction,
    )
  )[0];

  const auctionManagerKey: PublicKey = (
    await PublicKey.findProgramAddress(
      [Buffer.from(METAPLEX_PREFIX), auctionKey.toBuffer()],
      PROGRAM_IDS.metaplex,
    )
  )[0];

  await activateVault(
    new BN(0),
    vault,
    fractionMint,
    fractionTreasury,
    wallet.publicKey,
    instructions,
  );

  const outstandingShareAccount = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    fractionMint,
    wallet.publicKey,
    signers,
  );

  const payingTokenAccount = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    priceMint,
    wallet.publicKey,
    signers,
  );

  let transferAuthority = Keypair.generate();

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
    outstandingShareAccount,
    payingTokenAccount,
    fractionMint,
    fractionTreasury,
    redeemTreasury,
    auctionManagerKey,
    wallet.publicKey,
    transferAuthority.publicKey,
    externalPriceAccount,
    instructions,
  );

  return { instructions, signers };
}
