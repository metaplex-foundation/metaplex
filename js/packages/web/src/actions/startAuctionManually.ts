import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { startAuction } from '@oyster/common/dist/lib/models/metaplex/index';
import { notify, sendTransactionWithRetry, WalletSigner } from '@oyster/common';
import { AuctionViewLimited } from '../hooks';

export async function startAuctionManually(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionViewLimited,
) {
  try {
    const signers: Keypair[] = [];
    const instructions: TransactionInstruction[] = [];

    await startAuction(
      auctionView.vault.pubkey,
      auctionView.auctionManager.info.authority,
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
