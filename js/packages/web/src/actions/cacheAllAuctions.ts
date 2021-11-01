import { Connection } from '@solana/web3.js';
import {
  AuctionManagerV1,
  AuctionManagerV2,
  getAuctionCache,
  MetaplexKey,
  ParsedAccount,
  SafetyDepositBox,
  sendTransactions,
  SequenceType,
  StoreIndexer,
  WalletSigner,
  AuctionCache,
  loadSafeteyDepositBoxesForVaults,
  loadStoreIndexers,
} from '@oyster/common';
import { cacheAuctionIndexer } from './cacheAuctionIndexer';
import { buildListWhileNonZero } from '../hooks';

// This command caches an auction at position 0, page 0, and moves everything up
export async function cacheAllAuctions(
  wallet: WalletSigner,
  connection: Connection,
  auctionManagers: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>[],
  auctionCaches: Record<string, ParsedAccount<AuctionCache>>,
  storeIndexer: ParsedAccount<StoreIndexer>[],
): Promise<void> {
  const vaultPubKeys = auctionManagers.map(
    auctionManager => auctionManager.info.vault,
  );
  const { safetyDepositBoxesByVaultAndIndex } =
    await loadSafeteyDepositBoxesForVaults(connection, vaultPubKeys);
  let storeIndex = [...storeIndexer];
  for (const auctionManager of auctionManagers) {
    const boxes: ParsedAccount<SafetyDepositBox>[] = buildListWhileNonZero(
      safetyDepositBoxesByVaultAndIndex,
      auctionManager.info.vault,
    );

    if (auctionManager.info.key !== MetaplexKey.AuctionManagerV2) {
      return;
    }

    const auctionCachePubkey = await getAuctionCache(
      auctionManager.info.auction,
    );

    const { instructions, signers } = await cacheAuctionIndexer(
      wallet,
      auctionManager.info.vault,
      auctionManager.info.auction,
      auctionManager.pubkey,
      boxes.map(a => a.info.tokenMint),
      storeIndex,
      !!auctionCaches[auctionCachePubkey],
    );

    await sendTransactions(
      connection,
      wallet,
      instructions,
      signers,
      SequenceType.StopOnFailure,
      'max',
    );

    const { storeIndexer } = await loadStoreIndexers(connection);

    storeIndex = storeIndexer;
  }
}
