import type { ParsedAccount, Metadata, MetaState } from '@oyster/common';
import {
  getAuctionState,
  AuctionViewState,
} from '@oyster/common/dist/lib/models/auction';
import { NexusGenInputs } from '../generated/typings';
import { Auction } from '../sourceTypes';
import { wrapPubkey } from '../utils/mapInfo';
import { getAuctionMetadata } from './mappers';

export const getAuctionById = (
  state: MetaState,
  auctionId: string,
): Auction | null => {
  const auction = state.auctions[auctionId];
  const manager = state.auctionManagersByAuction[auction?.pubkey];
  if (!auction || !manager) {
    return null;
  }
  return {
    ...wrapPubkey(auction),
    manager: wrapPubkey(manager),
  };
};

export const getAuctionsByStoreId = (
  { auctionManagersByAuction, auctions }: MetaState,
  storeId?: string | null,
): Auction[] => {
  return Object.values(auctionManagersByAuction)
    .filter(manager => {
      const auction = auctions[manager.info.auction];
      return auction && (!storeId || manager.info.store === storeId);
    })
    .reduce((memo, manager) => {
      const auction = auctions[manager.info.auction];
      if (auction) {
        memo[memo.length] = {
          ...wrapPubkey(auction),
          manager: wrapPubkey(manager),
        };
      }
      return memo;
    }, [] as Auction[]);
};

export const filterByState = (
  { state }: Pick<NexusGenInputs['AuctionsInput'], 'state'>,
  metastate: MetaState,
) => {
  const isResaleMint = (mint: ParsedAccount<Metadata>) =>
    mint.info.primarySaleHappened;

  const hasResaleMint = (auction: Auction) => {
    return getAuctionMetadata(auction, metastate).some(isResaleMint);
  };

  if (state === 'resale') {
    return (auction: Auction) =>
      getAuctionState(auction) === AuctionViewState.Live &&
      hasResaleMint(auction);
  }
  if (state === 'live') {
    return (auction: Auction) =>
      getAuctionState(auction) === AuctionViewState.Live &&
      !hasResaleMint(auction);
  }
  if (state === 'ended') {
    return (auction: Auction) =>
      getAuctionState(auction) === AuctionViewState.Ended;
  }
  return () => true;
};

// const sortByEnd = (a, b) => {
//         a.auction.info.endedAt
//           ?.sub(b.auction.info.endedAt || new BN(0))
//           .toNumber() || 0,
// }

export const filterByParticipant = (
  { participantId }: Pick<NexusGenInputs['AuctionsInput'], 'participantId'>,
  state: MetaState,
) => {
  const bidders = Object.values(state.bidderMetadataByAuctionAndBidder);
  return (auction: Auction) => {
    return (
      !participantId ||
      bidders.some(
        ({ info }) =>
          info.auctionPubkey == auction.pubkey &&
          info.bidderPubkey === participantId,
      )
    );
  };
};
