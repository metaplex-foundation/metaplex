import { Connection, PublicKey } from '@solana/web3.js';
import {
  BidderMetadata,
  BidRedemptionTicket,
  ParsedAccount,
  PrizeTrackingTicket,
  sendTransactions,
  TokenAccount,
} from '@oyster/common';

import { claimUnusedPrizes } from '../../../actions/claimUnusedPrizes';
import { endAuction } from '../../../models/metaplex/endAuction';
import { AuctionView } from '../../../hooks';
import { WalletContextState } from '@solana/wallet-adapter-react';

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

  const endAuctionInstructions = [];
  await endAuction(
    new PublicKey(vault.pubkey),
    new PublicKey(auctionManager.authority),
    endAuctionInstructions,
  );

  const claimInstructions = [];
  const claimSigners = [];
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

  return sendTransactions(connection, wallet, instructions, signers);
}
