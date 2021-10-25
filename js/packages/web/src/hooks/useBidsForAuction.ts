import { useEffect, useMemo, useState } from 'react';
import {
  BidderMetadata,
  BidderMetadataParser,
  cache,
  ParsedAccount,
  StringPublicKey,
  USE_SPEED_RUN,
} from '@oyster/common';
import { getBidderMetadataByAuctionAndBidder } from './getData';

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
        getBids(id).then(value => setBids(value));
      }
    });
    getBids(id).then(value => setBids(value));
    return () => {
      dispose();
    };
  }, [id]);

  return bids;
};

const getBids = async (id?: StringPublicKey) => {
  // I have no idea why, but cache doesnt work with speed run and i couldnt figure it out for the life of me,
  // because that file is so confusing I have no idea how it works.
  // so we use the tempCache for pulling bids. B come save me.- J
  let bids;
  if (USE_SPEED_RUN) {
    bids = await getBidderMetadataByAuctionAndBidder(id || '', '');
  } else {
    bids = cache
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
      });
  }
  return bids
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
