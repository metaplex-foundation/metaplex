import { MetaState } from "../../common";
import { wrapPubkey } from "../../utils/mapInfo";
import { Auction } from "types/sourceTypes";

export function getAuctionsByStoreId(
  { auctionManagersByAuction, auctions }: MetaState,
  storeId?: string | null
): Auction[] {
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
}
