import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  BidderMetadata,
  ParsedAccount,
  sendTransactionsWithManualRetry,
  setAuctionAuthority,
  setVaultAuthority,
  TokenAccount,
  WalletSigner,
} from '@oyster/common';

import { AuctionView } from '../hooks';
import {
  AuctionManagerStatus,
  BidRedemptionTicket,
  PrizeTrackingTicket,
} from '../models/metaplex';
import { decommissionAuctionManager } from '../models/metaplex/decommissionAuctionManager';
import { claimUnusedPrizes } from './claimUnusedPrizes';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

export async function decommAuctionManagerAndReturnPrizes(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionView,
  accountsByMint: Map<string, TokenAccount>,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let signers: Array<Keypair[]> = [];
  let instructions: Array<TransactionInstruction[]> = [];

  if (auctionView.auctionManager.status === AuctionManagerStatus.Initialized) {
    let decomSigners: Keypair[] = [];
    let decomInstructions: TransactionInstruction[] = [];

    if (auctionView.auction.info.authority.equals(wallet.publicKey)) {
      await setAuctionAuthority(
        auctionView.auction.pubkey,
        wallet.publicKey,
        auctionView.auctionManager.pubkey,
        decomInstructions,
      );
    }
    if (auctionView.vault.info.authority.equals(wallet.publicKey)) {
      await setVaultAuthority(
        auctionView.vault.pubkey,
        wallet.publicKey,
        auctionView.auctionManager.pubkey,
        decomInstructions,
      );
    }
    await decommissionAuctionManager(
      auctionView.auctionManager.pubkey,
      auctionView.auction.pubkey,
      wallet.publicKey,
      auctionView.vault.pubkey,
      decomInstructions,
    );
    signers.push(decomSigners);
    instructions.push(decomInstructions);
  }

  await claimUnusedPrizes(
    connection,
    wallet,
    auctionView,
    accountsByMint,
    [],
    {},
    {},
    signers,
    instructions,
  );

  await sendTransactionsWithManualRetry(
    connection,
    wallet,
    instructions,
    signers,
  );
}
