import type {
  AuctionManagerV1,
  AuctionManagerV2,
  AuctionData,
} from "../common/index";

export type { WhitelistedCreator, Metadata } from "../common/index";

export type AuctionManager = AuctionManagerV1 | AuctionManagerV2;
export type Auction = AuctionData & {
  manager: AuctionManager;
};
