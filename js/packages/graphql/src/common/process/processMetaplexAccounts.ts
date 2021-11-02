import {
  decodeAuctionManager,
  decodeBidRedemptionTicket,
  decodePayoutTicket,
  decodePrizeTrackingTicket,
  decodeSafetyDepositConfig,
  decodeStore,
  decodeWhitelistedCreator,
  MetaplexKey,
} from '../models/metaplex';
import { METAPLEX_ID, AccountInfoOwnerString } from '../utils';
import { createProcessor, createPipeline } from './utils';

const isMetaplexAccount = (account: AccountInfoOwnerString<Buffer>) =>
  account.owner === METAPLEX_ID;

const isAuctionManagerV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.AuctionManagerV1;

const isAuctionManagerV2Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.AuctionManagerV2;

const isBidRedemptionTicketV1Account = (
  account: AccountInfoOwnerString<Buffer>,
) => account.data[0] === MetaplexKey.BidRedemptionTicketV1;

const isBidRedemptionTicketV2Account = (
  account: AccountInfoOwnerString<Buffer>,
) => account.data[0] === MetaplexKey.BidRedemptionTicketV2;

const isPayoutTicketV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.PayoutTicketV1;

const isPrizeTrackingTicketV1Account = (
  account: AccountInfoOwnerString<Buffer>,
) => account.data[0] === MetaplexKey.PrizeTrackingTicketV1;

const isStoreV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.StoreV1;

const isSafetyDepositConfigV1Account = (
  account: AccountInfoOwnerString<Buffer>,
) => account.data[0] === MetaplexKey.SafetyDepositConfigV1;

const isWhitelistedCreatorV1Account = (
  account: AccountInfoOwnerString<Buffer>,
) => account.data[0] === MetaplexKey.WhitelistedCreatorV1;

export const METAPLEX_ACCOUNTS_PROCESSOR = createPipeline(
  {
    auctionManagers: createProcessor(
      acc => isAuctionManagerV1Account(acc) || isAuctionManagerV2Account(acc),
      ({ account, pubkey }) => {
        return decodeAuctionManager(account.data, pubkey);
      },
    ),
    bidRedemptions: createProcessor(
      acc =>
        isBidRedemptionTicketV1Account(acc) ||
        isBidRedemptionTicketV2Account(acc),
      ({ account, pubkey }) => {
        return decodeBidRedemptionTicket(account.data, pubkey);
      },
    ),

    payoutTickets: createProcessor(
      acc => isPayoutTicketV1Account(acc),
      ({ account, pubkey }) => {
        return decodePayoutTicket(account.data, pubkey);
      },
    ),

    prizeTrackingTickets: createProcessor(
      acc => isPrizeTrackingTicketV1Account(acc),
      ({ account, pubkey }) => {
        return decodePrizeTrackingTicket(account.data, pubkey);
      },
    ),

    safetyDepositConfigs: createProcessor(
      acc => isSafetyDepositConfigV1Account(acc),
      ({ account, pubkey }) => {
        return decodeSafetyDepositConfig(account.data, pubkey);
      },
    ),

    stores: createProcessor(
      acc => isStoreV1Account(acc),
      ({ account, pubkey }) => {
        return decodeStore(account.data, pubkey);
      },
    ),
    creators: createProcessor(
      acc => isWhitelistedCreatorV1Account(acc),
      ({ account, pubkey }) => {
        return decodeWhitelistedCreator(account.data, pubkey);
      },
    ),
  },
  isMetaplexAccount,
);
