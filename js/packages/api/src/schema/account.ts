import { objectType, core } from 'nexus';
import { NexusObjectTypeDef, NexusUnionTypeDef } from 'nexus/dist/core';
import {
  AuctionData,
  AuctionDataExtended,
  BidderMetadata,
  BidderPot,
} from './auction';
import { Edition, MasterEdition, Metadata } from './metadata';
import {
  AuctionManagerV1,
  AuctionManagerV2,
  BidRedemptionTicket,
  PayoutTicket,
  PrizeTrackingTicket,
  SafetyDepositConfig,
  Store,
  WhitelistedCreator,
} from './metaplex';
import { SafetyDepositBox, Vault } from './vault';

const parsedAccount = (t: core.ObjectDefinitionBlock<any>) => {
  t.pubkey('pubkey');
  t.field('account', { type: Account });
};

export const Account = objectType({
  name: 'Account',
  definition(t) {
    t.int('lamports');
    t.pubkey('owner');
    t.buffer('data');
  },
});

export const ParsedAccount = objectType({
  name: 'ParsedAccount',
  definition(t) {
    parsedAccount(t);
  },
});

const accountWith = <T extends string, K extends string>(
  name: K,
  type: NexusObjectTypeDef<T> | NexusUnionTypeDef<T> | string,
) =>
  objectType({
    name,
    definition(t) {
      parsedAccount(t);
      t.field('info', { type } as never);
    },
  });

export const AccountWithMetadata = accountWith('AccountWithMetadata', Metadata);
export const AccountWithEdition = accountWith('AccountWithEdition', Edition);
export const AccountWithMasterEdition = accountWith(
  'AccountWithMasterEdition',
  MasterEdition,
);
export const AccountWithVault = accountWith('AccountWithVault', Vault);
export const AccountWithSafetyDepositBox = accountWith(
  'AccountWithSafetyDepositBox',
  SafetyDepositBox,
);
export const AccountWithAuctionData = accountWith(
  'AccountWithAuctionData',
  AuctionData,
);
export const AccountWithAuctionDataExtended = accountWith(
  'AccountWithAuctionDataExtended',
  AuctionDataExtended,
);
export const AccountWithBidderMetadata = accountWith(
  'AccountWithBidderMetadata',
  BidderMetadata,
);
export const AccountWithBidderPot = accountWith(
  'AccountWithBidderPot',
  BidderPot,
);
export const AccountWithAuctionManagerV1 = accountWith(
  'AccountWithAuctionManagerV1',
  AuctionManagerV1,
);
export const AccountWithAuctionManagerV2 = accountWith(
  'AccountWithAuctionManagerV2',
  AuctionManagerV2,
);
export const AccountWithBidRedemptionTicket = accountWith(
  'AccountWithBidRedemptionTicket',
  BidRedemptionTicket,
);
export const AccountWithPayoutTicket = accountWith(
  'AccountWithPayoutTicket',
  PayoutTicket,
);
export const AccountWithPrizeTrackingTicket = accountWith(
  'AccountWithPrizeTrackingTicket',
  PrizeTrackingTicket,
);
export const AccountWithStore = accountWith('AccountWithStore', Store);
export const AccountWithSafetyDepositConfig = accountWith(
  'AccountWithSafetyDepositConfig',
  SafetyDepositConfig,
);
export const AccountWithWhitelistedCreator = accountWith(
  'AccountWithWhitelistedCreator',
  WhitelistedCreator,
);
