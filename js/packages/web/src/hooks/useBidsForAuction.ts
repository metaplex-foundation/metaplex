import { useEffect, useMemo, useState } from 'react';
import { find, filter, take } from 'lodash';
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
    return find(bids || [], bid => !bid.info.cancelled);
  }, [bids]);

  return winner;
};

export const useWinningBidsForAuction = (
  auctionPubkey: StringPublicKey | string,
) => {
  const bids = useBidsForAuction(auctionPubkey);
  const { auctions } = useMeta();

  const auction = auctions[auctionPubkey];

  const winners = useMemo(() => {
    const activeBids = filter(bids || [], bid => !bid.info.cancelled);
    const maxWinners = auction.info.bidState.max.toNumber();

    return take(activeBids, maxWinners);
  }, [bids]);

  return winners;
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
