import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  startAuction,
  ParsedAccount,
  AuctionManagerV1,
  AuctionManagerV2,
} from '@oyster/common';
import { notify, sendTransactionWithRetry, WalletSigner } from '@oyster/common';

export async function startAuctionManually(
  connection: Connection,
  wallet: WalletSigner,
  auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>,
) {
  try {
    const signers: Keypair[] = [];
    const instructions: TransactionInstruction[] = [];

    await startAuction(
      auctionManager.info.vault,
      auctionManager.info.authority,
      instructions,
    );

    await sendTransactionWithRetry(connection, wallet, instructions, signers);

    notify({
      message: 'Auction started',
      type: 'success',
    });
  } catch (e) {
    notify({
      message: 'Transaction failed...',
      description: 'Failed to start the auction',
      type: 'error',
    });
    return Promise.reject(e);
  }
}
