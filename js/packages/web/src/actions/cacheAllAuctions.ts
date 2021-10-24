import { Connection } from '@solana/web3.js';
import {
  loadAccounts,
  MetaplexKey,
  MetaState,
  ParsedAccount,
  programIds,
  pullPages,
  SafetyDepositBox,
  sendTransactions,
  SequenceType,
  WalletSigner,
} from '@oyster/common';
import { cacheAuctionIndexer } from './cacheAuctionInIndexer';
import { buildListWhileNonZero } from '../hooks';
import { BN } from 'bn.js';

// This command caches an auction at position 0, page 0, and moves everything up
export async function cacheAllAuctions(
  wallet: WalletSigner,
  connection: Connection,
  tempCache: MetaState,
) {
  if (!programIds().store) {
    return false;
  }
  const store = programIds().store?.toBase58();

  if (tempCache.storeIndexer.length) {
    console.log('----> Previously indexed. Pulling all.');
    // well now we need to pull first.
    tempCache = await loadAccounts(connection);
  }

  let auctionManagersToCache = Object.values(tempCache.auctionManagersByAuction)
    .filter(
      a => a.info.store == store && a.info.key === MetaplexKey.AuctionManagerV2,
    )
    .sort((a, b) =>
      (
        tempCache.auctions[b.info.auction].info.endedAt ||
        new BN(Date.now() / 1000)
      )
        .sub(
          tempCache.auctions[a.info.auction].info.endedAt ||
            new BN(Date.now() / 1000),
        )
        .toNumber(),
    );

  const indexedInStoreIndexer = {};

  tempCache.storeIndexer.forEach(s => {
    s.info.auctionCaches.forEach(a => (indexedInStoreIndexer[a] = true));
  });

  const alreadyIndexed = Object.values(tempCache.auctionCaches).reduce(
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
  console.log('auctionManagersToCache:', auctionManagersToCache);

  for (let i = 0; i < auctionManagersToCache.length; i++) {
    const auctionManager = auctionManagersToCache[i];
    const boxes: ParsedAccount<SafetyDepositBox>[] = buildListWhileNonZero(
      tempCache.safetyDepositBoxesByVaultAndIndex,
      auctionManager.info.vault,
    );

    if (auctionManager.info.key === MetaplexKey.AuctionManagerV2) {
      const { instructions, signers, updateOnSuccess } =
        await cacheAuctionIndexer(
          wallet,
          auctionManager.info.vault,
          auctionManager.info.auction,
          auctionManager,
          boxes.map(a => a.info.tokenMint),
          tempCache.storeIndexer,
          tempCache,
        );

      await sendTransactions(
        connection,
        wallet,
        instructions,
        signers,
        SequenceType.StopOnFailure,
        'max',
      );

      updateOnSuccess();

      storeIndex = await pullPages(connection);
    }
  }
}
