import React, { useEffect, useMemo, useState } from 'react';
import {
  BidderMetadata,
  BidderMetadataParser,
  cache,
  ParsedAccount,
  StringPublicKey,
} from '@oyster/common';

export const useHighestBidForAuction = (
  auctionPubkey: StringPublicKey | string,
) => {
  const bids = useBidsForAuction(auctionPubkey);

  const winner = useMemo(() => {
    return bids?.[0];
  }, [bids]);

  return winner;
};

export const useBidsForAuction = (auctionPubkey: StringPublicKey | string) => {
  const id = useMemo(
    () =>
      typeof auctionPubkey === 'string'
        ? auctionPubkey !== ''
          ? auctionPubkey
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

const getBids = (id?: StringPublicKey) => {
  return cache
    .byParser(BidderMetadataParser)
    .filter(key => {
      const bidder = cache.get(key) as ParsedAccount<BidderMetadata>;
      if (!bidder) {
        return false;
      }

      return id === bidder.info.auctionPubkey;
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
