import {
  AuctionData,
  AuctionDataExtended,
  BidderMetadata,
  BidderPot,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  SafetyDepositBox,
  Vault,
} from "../../actions";
import {
  AuctionManagerV1,
  AuctionManagerV2,
  BidRedemptionTicket,
  PayoutTicket,
  PrizeTrackingTicket,
  SafetyDepositConfig,
  Store,
  WhitelistedCreator,
} from "../../models";

import { PublicKeyStringAndAccount, AccountInfoOwnerString } from "../../utils";

export type MetaMap = {
  vault: Vault;
  safetyDepositBox: SafetyDepositBox;
  auction: AuctionData;
  auctionDataExtended: AuctionDataExtended;
  bidderMetadata: BidderMetadata;
  bidderPot: BidderPot;
  auctionManager: AuctionManagerV1 | AuctionManagerV2;
  bidRedemption: BidRedemptionTicket;
  payoutTicket: PayoutTicket;
  prizeTrackingTicket: PrizeTrackingTicket;
  safetyDepositConfig: SafetyDepositConfig;
  store: Store;
  creator: WhitelistedCreator;
  metadata: Metadata;
  edition: Edition;
  masterEdition: MasterEditionV1 | MasterEditionV2;
};

type MapTree<T> = {
  [K in keyof T]: Map<string, T[K]>;
};

export type MetaState = MapTree<MetaMap>;

export type UpdateStateValueFunc<T = MetaMap, K extends keyof T = keyof T> = (
  prop: K,
  key: string,
  value: T[K]
) => Promise<void>;

export type ProcessAccountsFunc = (
  account: PublicKeyStringAndAccount<Buffer>,
  setter: UpdateStateValueFunc
) => Promise<void>;

export type CheckAccountFunc = (
  account: AccountInfoOwnerString<Buffer>
) => boolean;
