import React, { useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  BidderMetadata,
  BidderMetadataParser,
  cache,
  ParsedAccount,
} from '@oyster/common';

export const useHighestBidForAuction = (auctionPubkey: PublicKey | string) => {
  const bids = useBidsForAuction(auctionPubkey);

  const winner = useMemo(() => {
    return bids?.[0];
  }, [bids]);

  return winner;
};

export const useBidsForAuction = (auctionPubkey: PublicKey | string) => {
  const id = useMemo(
    () =>
      typeof auctionPubkey === 'string'
        ? auctionPubkey !== ''
          ? new PublicKey(auctionPubkey)
          : undefined
        : auctionPubkey,
    [auctionPubkey],
  );

  const [bids, setBids] = useState<ParsedAccount<BidderMetadata>[]>([]);

  useEffect(() => {
    const dispose = cache.emitter.onCache(args => {
      if (args.parser === BidderMetadataParser) {
        setBids(getBids(id));
      }
    });

    setBids(getBids(id));

    return () => {
      dispose();
    };
  }, [id]);

  return bids;
};

const getBids = (id?: PublicKey) => {
  return cache
    .byParser(BidderMetadataParser)
    .filter(key => {
      const bidder = cache.get(key) as ParsedAccount<BidderMetadata>;
      if (!bidder) {
        return false;
      }

      return id?.equals(bidder.info.auctionPubkey);
    })
    .map(key => {
      const bidder = cache.get(key) as ParsedAccount<BidderMetadata>;
      return bidder;
    })
    .sort((a, b) => {
      const lastBidDiff = b.info.lastBid.sub(a.info.lastBid).toNumber();
      if (lastBidDiff === 0) {
        return a.info.lastBidTimestamp.sub(b.info.lastBidTimestamp).toNumber();
      }

      return lastBidDiff;
    })
    .map(item => {
      return item;
    });
};
