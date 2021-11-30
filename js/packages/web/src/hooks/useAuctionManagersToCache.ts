import { useMemo } from 'react';
import {
  AuctionManagerV1,
  AuctionManagerV2,
  MetaplexKey,
  ParsedAccount,
  useMeta,
  useStore,
} from '@oyster/common';
import BN from 'bn.js';

interface AuctionCacheStatus {
  auctionManagersToCache: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>[];
  auctionManagerTotal: number;
  auctionCacheTotal: number;
}

export const useAuctionManagersToCache = (): AuctionCacheStatus => {
  const { auctionManagersByAuction, auctions, auctionCaches, storeIndexer } =
    useMeta();
  const { storeAddress } = useStore();

  const auctionManagersToCache = useMemo(() => {
    let auctionManagersToCache = Object.values(auctionManagersByAuction)
      .filter(
        a =>
          a.info.store == storeAddress &&
          a.info.key === MetaplexKey.AuctionManagerV2 &&
          auctions[a.info.auction],
      )
      .sort((a, b) =>
        (auctions[b.info.auction].info.endedAt || new BN(Date.now() / 1000))
          .sub(
            auctions[a.info.auction].info.endedAt || new BN(Date.now() / 1000),
          )
          .toNumber(),
      );

    const indexedInStoreIndexer: Record<string, boolean | undefined> = {};

    storeIndexer.forEach(s => {
      s.info.auctionCaches.forEach(a => (indexedInStoreIndexer[a] = true));
    });

    const alreadyIndexed = Object.values(auctionCaches).reduce((hash, val) => {
      hash[val.info.auctionManager] = indexedInStoreIndexer[val.pubkey];

      return hash;
    }, {} as Record<string, boolean | undefined>);
    auctionManagersToCache = auctionManagersToCache.filter(
      a => !alreadyIndexed[a.pubkey],
    );

    return auctionManagersToCache;
  }, [auctionManagersByAuction, auctions, auctionCaches, storeIndexer]);

  const auctionCacheTotal = useMemo(() => {
    return storeIndexer.reduce((memo, storeIndexer) => {
      let next = memo;
      if (storeIndexer.info.store !== storeAddress) {
        return memo;
      }

      storeIndexer.info.auctionCaches.forEach(() => {
        next++;
      });

      return next;
    }, 0);
  }, [storeIndexer, storeAddress]);

  const auctionManagerTotal = useMemo(() => {
    return Object.values(auctionManagersByAuction).filter(
      ({ info: { store, key } }) =>
        store === storeAddress && key === MetaplexKey.AuctionManagerV2,
    ).length;
  }, [auctionManagersToCache, storeAddress]);

  return {
    auctionCacheTotal,
    auctionManagerTotal,
    auctionManagersToCache,
  };
};
