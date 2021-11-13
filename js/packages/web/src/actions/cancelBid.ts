import {
  TokenAccount,
  cancelBid,
  cache,
  ensureWrappedAccount,
  sendTransactionWithRetry,
  AuctionState,
  SequenceType,
  sendTransactions,
  ParsedAccount,
  BidderMetadata,
  StringPublicKey,
  WalletSigner,
  toPublicKey,
  pubkeyToString,
  WRAPPED_SOL_MINT,
} from '@oyster/common';
import { AccountLayout } from '@solana/spl-token';
import { TransactionInstruction, Keypair, Connection } from '@solana/web3.js';
import { AuctionView } from '../hooks';
import {
  BidRedemptionTicket,
  PrizeTrackingTicket,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { findAta, setupPlaceBid } from './sendPlaceBid';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export async function sendCancelBid(
  connection: Connection,
  wallet: WalletSigner,
  payingAccount: StringPublicKey,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
  bids: ParsedAccount<BidderMetadata>[],
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>,
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  if (
    auctionView.auction.info.ended() &&
    auctionView.auction.info.state !== AuctionState.Ended
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
    connection,
  );

  if (
    wallet.publicKey.equals(
      toPublicKey(auctionView.auctionManager.authority),
    ) &&
    auctionView.auction.info.ended()
  ) {
    await claimUnusedPrizes(
      connection,
      wallet,
      auctionView,
      accountsByMint,
      bids,
      bidRedemptions,
      prizeTrackingTickets,
      signers,
      instructions,
    );
  }

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
  wallet: WalletSigner,
  signers: Array<Keypair[]>,
  instructions: Array<TransactionInstruction[]>,
  connection: Connection,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const cancelSigners: Keypair[] = [];
  const cancelInstructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];

  const tokenAccount = accountsByMint.get(auctionView.auction.info.tokenMint);
  const mint = cache.get(auctionView.auction.info.tokenMint);

  if (mint && auctionView.myBidderPot) {
    let receivingSolAccountOrAta = '';
    if (auctionView.auction.info.tokenMint == WRAPPED_SOL_MINT.toBase58()) {
      receivingSolAccountOrAta = ensureWrappedAccount(
        cancelInstructions,
        cleanupInstructions,
        tokenAccount,
        wallet.publicKey,
        accountRentExempt,
        cancelSigners,
      );
    } else {
      receivingSolAccountOrAta = await findAta(auctionView, wallet, connection);
    }

    await cancelBid(
      wallet.publicKey.toBase58(),
      pubkeyToString(receivingSolAccountOrAta),
      auctionView.myBidderPot.info.bidderPot,
      auctionView.auction.info.tokenMint,
      auctionView.vault.pubkey,
      cancelInstructions,
    );
    signers.push(cancelSigners);
    instructions.push([...cancelInstructions, ...cleanupInstructions]);
  }
}
