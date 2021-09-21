import { useEffect, useMemo, useState } from 'react';
import {
  BidderMetadata,
  BidderMetadataParser,
  cache,
  ParsedAccount,
  StringPublicKey,
  useMeta,
  USE_SPEED_RUN,
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
  const { bidderMetadataByAuctionAndBidder } = useMeta();

  const [bids, setBids] = useState<ParsedAccount<BidderMetadata>[]>([]);

  useEffect(() => {
    const dispose = cache.emitter.onCache(args => {
      if (args.parser === BidderMetadataParser) {
        setBids(getBids(bidderMetadataByAuctionAndBidder, id));
      }
    });

    setBids(getBids(bidderMetadataByAuctionAndBidder, id));

    return () => {
      dispose();
    };
  }, [id]);

  return bids;
};

const getBids = (
  bidderMetadataByAuctionAndBidder: Record<
    string,
    ParsedAccount<BidderMetadata>
  >,
  id?: StringPublicKey,
) => {
  // I have no idea why, but cache doesnt work with speed run and i couldnt figure it out for the life of me,
  // because that file is so confusing I have no idea how it works.
  // so we use the tempCache for pulling bids. B come save me.- J
  let bids;
  if (USE_SPEED_RUN) {
    bids = Object.values(bidderMetadataByAuctionAndBidder).filter(
      b => b.info.auctionPubkey === id,
    );
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
