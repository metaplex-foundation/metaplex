import {
  MetaState,
  ParsedAccount,
  Metadata,
  getAuctionState,
  AuctionViewState,
} from "../../common";
import { NexusGenInputs } from "../../generated/typings";
import { Auction } from "types/sourceTypes";
import { getAuctionMetadata } from "./getAuctionMetadata";

export function filterByState(
  { state }: Pick<NexusGenInputs["AuctionsInput"], "state">,
  metastate: MetaState
) {
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
}
