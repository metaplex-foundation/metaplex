import { useEffect, useMemo, useState } from 'react';
import {
  BidderMetadata,
  ParsedAccount,
  StringPublicKey,
  useMeta,
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
    setBids(getBids(bidderMetadataByAuctionAndBidder, id));
  }, [id, bidderMetadataByAuctionAndBidder]);

  return bids;
};

const getBids = (
  bidderMetadataByAuctionAndBidder: Record<
    string,
    ParsedAccount<BidderMetadata>
  >,
  id?: StringPublicKey,
) => {
  const bids = Object.values(bidderMetadataByAuctionAndBidder).filter(
    b => b.info.auctionPubkey === id,
  );

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
