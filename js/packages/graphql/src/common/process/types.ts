import {
  AuctionData,
  AuctionDataExtended,
  AuctionManagerV1,
  AuctionManagerV2,
  BidderMetadata,
  BidderPot,
  BidRedemptionTicket,
  Edition,
  MasterEditionV1,
  MasterEditionV2,
  Metadata,
  PayoutTicket,
  PrizeTrackingTicket,
  SafetyDepositBox,
  SafetyDepositConfig,
  Store,
  Vault,
  WhitelistedCreator,
} from '../models';
import { AccountInfoOwnerString, PublicKeyStringAndAccount } from '../utils';

export type MetaMap = {
  vaults: Vault;
  safetyDepositBoxes: SafetyDepositBox;
  auctions: AuctionData;
  auctionsDataExtended: AuctionDataExtended;
  bidderMetadatas: BidderMetadata;
  bidderPots: BidderPot;
  auctionManagers: AuctionManagerV1 | AuctionManagerV2;
  bidRedemptions: BidRedemptionTicket;
  payoutTickets: PayoutTicket;
  prizeTrackingTickets: PrizeTrackingTicket;
  safetyDepositConfigs: SafetyDepositConfig;
  stores: Store;
  creators: WhitelistedCreator;
  metadata: Metadata;
  editions: Edition;
  masterEditions: MasterEditionV1 | MasterEditionV2;
};

export type MetaTypes = keyof MetaMap;

type MapTree<T> = {
  [K in keyof T]: Map<string, T[K]>;
};

export type MetaState = MapTree<MetaMap>;

export type UpdateStateValueFunc<T = MetaMap, K extends keyof T = keyof T> = (
  prop: K,
  key: string,
  value: T[K],
) => Promise<void>;

export type ProcessAccountsFunc = (
  account: PublicKeyStringAndAccount<Buffer>,
  setter: UpdateStateValueFunc,
) => Promise<void>;

export type CheckAccountFunc = (
  account: AccountInfoOwnerString<Buffer>,
) => boolean;
