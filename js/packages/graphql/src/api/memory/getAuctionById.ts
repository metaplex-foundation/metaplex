import { MetaState } from "../../common";
import { wrapPubkey } from "../../utils/mapInfo";
import { Auction } from "types/sourceTypes";

export function getAuctionById(
  state: MetaState,
  auctionId: string
): Auction | null {
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
}
