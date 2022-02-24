import {
  Keypair,
  Connection,
  TransactionInstruction,
  Commitment,
} from '@solana/web3.js';
import {
  sendTransactionWithRetry,
  placeBid,
  cache,
  ensureWrappedAccount,
  toLamports,
  ParsedAccount,
  toPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { approve } from '@oyster/common/dist/lib/models/account';
import { TokenAccount } from '@oyster/common/dist/lib/models/account';

import { AccountLayout, MintInfo } from '@solana/spl-token';
import { AuctionView } from '../hooks';
import BN from 'bn.js';
import { setupCancelBid } from './cancelBid';
import { QUOTE_MINT } from '../constants';

export async function sendPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  // value entered by the user adjust to decimals of the mint
  amount: number | BN,
  commitment: Commitment = 'single',
) {
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];
  const bid = await setupPlaceBid(
    connection,
    wallet,
    bidderTokenAccount,
    auctionView,
    accountsByMint,
    amount,
    instructions,
    signers,
  );

  const res = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions[0],
    signers[0],
    commitment,
  );

  if (res.err) throw res.err.inner;

  const { txid } = res;

  return {
    amount: bid,
    txid,
  };
}

export async function setupPlaceBid(
  connection: Connection,
  wallet: WalletSigner,
  bidderTokenAccount: string | undefined,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  // value entered by the user adjust to decimals of the mint
  // If BN, then assume instant sale and decimals already adjusted.
  amount: number | BN,
  overallInstructions: TransactionInstruction[][],
  overallSigners: Keypair[][],
): Promise<BN> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const tokenAccount = bidderTokenAccount
    ? (cache.get(bidderTokenAccount) as TokenAccount)
    : undefined;
  const mint = cache.get(
    tokenAccount ? tokenAccount.info.mint : QUOTE_MINT,
  ) as ParsedAccount<MintInfo>;

  const lamports =
    accountRentExempt +
    (typeof amount === 'number'
      ? toLamports(amount, mint.info)
      : amount.toNumber());

  let bidderPotTokenAccount: string | undefined;
  if (auctionView.myBidderPot) {
    bidderPotTokenAccount = auctionView.myBidderPot?.info.bidderPot;
    if (!auctionView.auction.info.ended()) {
      const cancelSigners: Keypair[][] = [];
      const cancelInstr: TransactionInstruction[][] = [];
      await setupCancelBid(
        auctionView,
        accountsByMint,
        accountRentExempt,
        wallet,
        cancelSigners,
        cancelInstr,
      );
      signers = [...signers, ...cancelSigners[0]];
      instructions = [...cancelInstr[0], ...instructions];
    }
  }

  const payingSolAccount = ensureWrappedAccount(
    instructions,
    cleanupInstructions,
    tokenAccount,
    wallet.publicKey,
    lamports + accountRentExempt * 2,
    signers,
  );

  const transferAuthority = approve(
    instructions,
    cleanupInstructions,
    toPublicKey(payingSolAccount),
    wallet.publicKey,
    lamports - accountRentExempt,
  );

  signers.push(transferAuthority);

  const bid = new BN(lamports - accountRentExempt);
  await placeBid(
    wallet.publicKey.toBase58(),
    payingSolAccount,
    bidderPotTokenAccount,
    auctionView.auction.info.tokenMint,
    transferAuthority.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
    auctionView.auctionManager.vault,
    bid,
    instructions,
  );

  overallInstructions.push([...instructions, ...cleanupInstructions.reverse()]);
  overallSigners.push(signers);

  return bid;
}
