import {
  ParsedAccount,
  Metadata,
  getAuctionState,
  AuctionViewState,
} from "../common";
import { SMetaState } from "../api";
import { NexusGenInputs } from "../generated/typings";
import { Auction } from "../sourceTypes";
import { wrapPubkey } from "../utils/mapInfo";
import { getAuctionMetadata } from "./mappers";

export const getAuctionById = (
  state: SMetaState,
  auctionId: string
): Auction | null => {
  const auction = state.auctions.get(auctionId);
  const manager = auction?.pubkey
    ? state.auctionManagersByAuction.get(auction?.pubkey)
    : undefined;
  if (!auction || !manager) {
    return null;
  }
  return {
    ...wrapPubkey(auction),
    manager: wrapPubkey(manager),
  };
};

export const getAuctionsByStoreId = (
  { auctionManagersByAuction, auctions }: SMetaState,
  storeId?: string | null
): Auction[] => {
  return Array.from(auctionManagersByAuction.values())
    .filter((manager) => {
      const auction = auctions.get(manager.info.auction);
      return auction && (!storeId || manager.info.store === storeId);
    })
    .reduce((memo, manager) => {
      const auction = auctions.get(manager.info.auction);
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
  { state }: Pick<NexusGenInputs["AuctionsInput"], "state">,
  metastate: SMetaState
) => {
  const isResaleMint = (mint?: ParsedAccount<Metadata>): boolean =>
    !!mint?.info.primarySaleHappened;

  const hasResaleMint = (auction: Auction) => {
    return getAuctionMetadata(auction, metastate).some(isResaleMint);
  };

  if (state === "resale") {
    return (auction: Auction) =>
      getAuctionState(auction) === AuctionViewState.Live &&
      hasResaleMint(auction);
  }
  if (state === "live") {
    return (auction: Auction) =>
      getAuctionState(auction) === AuctionViewState.Live &&
      !hasResaleMint(auction);
  }
  if (state === "ended") {
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
  { participantId }: Pick<NexusGenInputs["AuctionsInput"], "participantId">,
  state: SMetaState
) => {
  const bidders = Array.from(state.bidderMetadataByAuctionAndBidder.values());
  return (auction: Auction) => {
    if (!participantId) {
      return true;
    }
    for (const { info } of bidders) {
      if (
        info.auctionPubkey == auction.pubkey &&
        info.bidderPubkey === participantId
      ) {
        return true;
      }
    }
    return false;
  };
};
