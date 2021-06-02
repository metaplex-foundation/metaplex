import React, { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  AuctionData,
  BidderMetadata,
  BidderMetadataParser,
  cache,
  ParsedAccount,
} from '@oyster/common';
import { useAuction } from './useAuction';

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
        ? auctionPubkey
        : auctionPubkey.toBase58(),
    [auctionPubkey],
  );

  const bids = cache
    .byParser(BidderMetadataParser)
    .filter(key => {
      const bidder = cache.get(key) as ParsedAccount<BidderMetadata>;
      if (!bidder) {
        return false;
      }

      return bidder.info.auctionPubkey.toBase58() === id;
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
      return {
        ...item,
      };
    });

  return bids;
};
