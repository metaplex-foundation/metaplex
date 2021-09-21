import { Keypair, Connection, TransactionInstruction } from '@solana/web3.js';
import {
  ParsedAccount,
  SafetyDepositBox,
  sendTransactionsWithManualRetry,
  setAuctionAuthority,
  setVaultAuthority,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { AuctionView } from '../hooks';
import { AuctionManagerStatus } from '@oyster/common/dist/lib/models/metaplex/index';
import { decommissionAuctionManager } from '@oyster/common/dist/lib/models/metaplex/decommissionAuctionManager';
import { unwindVault } from './unwindVault';

export async function decommAuctionManagerAndReturnPrizes(
  connection: Connection,
  wallet: WalletSigner,
  auctionView: AuctionView,
  safetyDepositBoxesByVaultAndIndex: Record<
    string,
    ParsedAccount<SafetyDepositBox>
  >,
) {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Array<Keypair[]> = [];
  const instructions: Array<TransactionInstruction[]> = [];

  if (auctionView.auctionManager.status === AuctionManagerStatus.Initialized) {
    const decomSigners: Keypair[] = [];
    const decomInstructions: TransactionInstruction[] = [];

    if (auctionView.auction.info.authority === wallet.publicKey.toBase58()) {
      await setAuctionAuthority(
        auctionView.auction.pubkey,
        wallet.publicKey.toBase58(),
        auctionView.auctionManager.pubkey,
        decomInstructions,
      );
    }
    if (auctionView.vault.info.authority === wallet.publicKey.toBase58()) {
      await setVaultAuthority(
        auctionView.vault.pubkey,
        wallet.publicKey.toBase58(),
        auctionView.auctionManager.pubkey,
        decomInstructions,
      );
    }
    await decommissionAuctionManager(
      auctionView.auctionManager.pubkey,
      auctionView.auction.pubkey,
      wallet.publicKey.toBase58(),
      auctionView.vault.pubkey,
      decomInstructions,
    );
    signers.push(decomSigners);
    instructions.push(decomInstructions);
  }

  await sendTransactionsWithManualRetry(
    connection,
    wallet,
    instructions,
    signers,
  );

  // now that is rightfully decommed, we have authority back properly to the vault,
  // and the auction manager is in disbursing, so we can unwind the vault.
  await unwindVault(
    connection,
    wallet,
    auctionView.vault,
    safetyDepositBoxesByVaultAndIndex,
  );
}
