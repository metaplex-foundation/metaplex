import {
  TokenAccount,
  cancelBid,
  cache,
  ensureWrappedAccount,
  sendTransactionWithRetry,
  AuctionState,
  SequenceType,
  sendTransactions,
} from '@oyster/common';
import { AccountLayout } from '@solana/spl-token';
import {
  TransactionInstruction,
  Keypair,
  Connection,
  PublicKey,
} from '@solana/web3.js';
import { AuctionView } from '../hooks';
import { setupPlaceBid } from './sendPlaceBid';

export async function sendCancelBid(
  connection: Connection,
  wallet: any,
  payingAccount: PublicKey,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
) {
  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];
  if (
    auctionView.auction.info.ended() &&
    auctionView.auction.info.state != AuctionState.Ended
  ) {
    await setupPlaceBid(
      connection,
      wallet,
      payingAccount,
      auctionView,
      accountsByMint,
      0,
      instructions,
      signers,
    );
  }

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  await setupCancelBid(
    auctionView,
    accountsByMint,
    accountRentExempt,
    wallet,
    signers,
    instructions,
  );

  instructions.length === 1
    ? await sendTransactionWithRetry(
        connection,
        wallet,
        instructions[0],
        signers[0],
        'single',
      )
    : await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        'single',
      );
}

export async function setupCancelBid(
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  accountRentExempt: number,
  wallet: any,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
) {
  let cancelSigners: Keypair[] = [];
  let cancelInstructions: TransactionInstruction[] = [];
  let cleanupInstructions: TransactionInstruction[] = [];

  let tokenAccount = accountsByMint.get(
    auctionView.auction.info.tokenMint.toBase58(),
  );
  const mint = cache.get(auctionView.auction.info.tokenMint);

  if (mint && auctionView.myBidderPot) {
    const receivingSolAccount = ensureWrappedAccount(
      cancelInstructions,
      cleanupInstructions,
      tokenAccount,
      wallet.publicKey,
      accountRentExempt,
      cancelSigners,
    );

    await cancelBid(
      wallet.publicKey,
      receivingSolAccount,
      auctionView.myBidderPot.info.bidderPot,
      auctionView.auction.info.tokenMint,
      auctionView.vault.pubkey,
      cancelInstructions,
    );
    signers.push(cancelSigners);
    instructions.push([...cancelInstructions, ...cleanupInstructions]);
  }
}
