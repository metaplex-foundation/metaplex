import { Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  AuctionManagerV1,
  AuctionManagerV2,
  getAuctionCache,
  MetaplexKey,
  ParsedAccount,
  SafetyDepositBox,
  sendTransactions,
  AuctionData,
  SequenceType,
  StoreIndexer,
  WalletSigner,
  AuctionCache,
  loadSafeteyDepositBoxesForVaults,
  useStore,
  StringPublicKey,
} from '@oyster/common';
import { cacheAuctionIndexer } from './cacheAuctionIndexer';
import { buildListWhileNonZero } from '../hooks';
import { BN } from 'bn.js';

// This command caches an auction at position 0, page 0, and moves everything up
// Required MetaState:
// - [param] auctionManagersByAuction
// - [param] storeIndexer
// - [param] auctions
// - [param] auctionsCache
// - [lookup] safetyDepositBoxesByVault
export async function cacheAllAuctions(
  wallet: WalletSigner,
  connection: Connection,
  storeAddress: StringPublicKey | undefined,
  auctionManagersByAuction: Record<string, ParsedAccount<AuctionManagerV1 | AuctionManagerV2>>,
  auctions: Record<string, ParsedAccount<AuctionData>>,
  auctionCaches: Record<string, ParsedAccount<AuctionCache>>,
  storeIndexer: ParsedAccount<StoreIndexer>[],
) {
  let auctionManagersToCache = Object.values(auctionManagersByAuction)
    .filter(a => a.info.store == storeAddress)
    .sort((a, b) =>
      (
        auctions[b.info.auction].info.endedAt ||
        new BN(Date.now() / 1000)
      )
        .sub(
          auctions[a.info.auction].info.endedAt ||
            new BN(Date.now() / 1000),
        )
        .toNumber(),
    );

  const indexedInStoreIndexer = {};

  storeIndexer.forEach(s => {
    s.info.auctionCaches.forEach(a => (indexedInStoreIndexer[a] = true));
  });

  const alreadyIndexed = Object.values(auctionCaches).reduce(
    (hash, val) => {
      hash[val.info.auctionManager] = indexedInStoreIndexer[val.pubkey];

      return hash;
    },
    {},
  );
  auctionManagersToCache = auctionManagersToCache.filter(
    a => !alreadyIndexed[a.pubkey],
  );

  console.log(
    '----> Found ',
    auctionManagersToCache.length,
    'auctions to cache.',
  );

  const vaultPubKeys = auctionManagersToCache.map(auctionManager => auctionManager.info.vault);
  const { safetyDepositBoxesByVaultAndIndex } = await loadSafeteyDepositBoxesForVaults(connection, vaultPubKeys)

  let storeIndex = [...storeIndexer];
  for (let i = 0; i < auctionManagersToCache.length; i++) {
    const auctionManager = auctionManagersToCache[i];
    const boxes: ParsedAccount<SafetyDepositBox>[] = buildListWhileNonZero(
      safetyDepositBoxesByVaultAndIndex,
      auctionManager.info.vault,
    );
    if (auctionManager.info.key === MetaplexKey.AuctionManagerV2) {
      const { instructions, signers } = await cacheAuctionIndexer(
        wallet,
        auctionManager.info.vault,
        auctionManager.info.auction,
        auctionManager.pubkey,
        boxes.map(a => a.info.tokenMint),
        storeIndex,
        !!auctionCaches[
          await getAuctionCache(auctionManager.info.auction)
        ],
      );

      await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        'max',
      );
    }
  }
}
