import {
  BidderMetadata,
  BidRedemptionTicket,
  ParsedAccount,
  PrizeTrackingTicket,
  sendTransactions,
  SequenceType,
  TokenAccount,
} from '@oyster/common';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { claimUnusedPrizes } from '../../../actions/claimUnusedPrizes';
import { AuctionView } from '../../../hooks';
import { endAuction } from '../../../models/metaplex/endAuction';

interface EndSaleParams {
  auctionView: AuctionView;
  connection: Connection;
  accountByMint: Map<string, TokenAccount>;
  bids: ParsedAccount<BidderMetadata>[];
  bidRedemptions: Record<string, ParsedAccount<BidRedemptionTicket>>;
  prizeTrackingTickets: Record<string, ParsedAccount<PrizeTrackingTicket>>;
  wallet: WalletContextState;
}

export async function endSale({
  auctionView,
  connection,
  accountByMint,
  bids,
  bidRedemptions,
  prizeTrackingTickets,
  wallet,
}: EndSaleParams) {
  const { vault, auctionManager } = auctionView;

  const endAuctionInstructions: TransactionInstruction[] = [];
  await endAuction(
    new PublicKey(vault.pubkey),
    new PublicKey(auctionManager.authority),
    endAuctionInstructions,
  );

  const claimInstructions: TransactionInstruction[][] = [];
  const claimSigners: Keypair[][] = [];
  await claimUnusedPrizes(
    connection,
    wallet,
    auctionView,
    accountByMint,
    bids,
    bidRedemptions,
    prizeTrackingTickets,
    claimSigners,
    claimInstructions,
  );

  const instructions = [endAuctionInstructions, ...claimInstructions];
  const signers = [[], ...claimSigners];

  return sendTransactions(
    connection,
    wallet,
    instructions,
    signers,
    SequenceType.Sequential,
    'finalized',
  );
}
