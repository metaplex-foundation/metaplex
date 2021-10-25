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

/*
export const processMetaplexAccounts: ProcessAccountsFunc = async (
  { account, pubkey },
  setter,
) => {
  if (!isMetaplexAccount(account)) return;

  try {
    if (
      isAuctionManagerV1Account(account) ||
      isAuctionManagerV2Account(account)
    ) {
      const auctionManager = decodeAuctionManager(account.data, pubkey);
      await setter('auctionManagers', pubkey, auctionManager);
    }

    if (
      isBidRedemptionTicketV1Account(account) ||
      isBidRedemptionTicketV2Account(account)
    ) {
      const ticket = decodeBidRedemptionTicket(account.data, pubkey);
      await setter('bidRedemptions', pubkey, ticket);
    }

    if (isPayoutTicketV1Account(account)) {
      const ticket = decodePayoutTicket(account.data, pubkey);
      await setter('payoutTickets', pubkey, ticket);
    }

    if (isPrizeTrackingTicketV1Account(account)) {
      const ticket = decodePrizeTrackingTicket(account.data, pubkey);
      await setter('prizeTrackingTickets', pubkey, ticket);
    }

    if (isSafetyDepositConfigV1Account(account)) {
      const config = decodeSafetyDepositConfig(account.data, pubkey);
      await setter('safetyDepositConfigs', pubkey, config);
    }

    if (isStoreV1Account(account)) {
      const store = decodeStore(account.data, pubkey);
      await setter('stores', pubkey, store);
    }

    if (isWhitelistedCreatorV1Account(account)) {
      const creator = decodeWhitelistedCreator(account.data, pubkey);
      await setter('creators', pubkey, creator);
    }
  } catch (err) {
    logger.warn(err);
  }
};
*/

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
      ({ account, pubkey }) => decodeAuctionManager(account.data, pubkey),
    ),
    bidRedemptions: createProcessor(
      acc =>
        isBidRedemptionTicketV1Account(acc) ||
        isBidRedemptionTicketV2Account(acc),
      ({ account, pubkey }) => decodeBidRedemptionTicket(account.data, pubkey),
    ),

    payoutTickets: createProcessor(
      acc => isPayoutTicketV1Account(acc),
      ({ account, pubkey }) => decodePayoutTicket(account.data, pubkey),
    ),

    prizeTrackingTickets: createProcessor(
      acc => isPrizeTrackingTicketV1Account(acc),
      ({ account, pubkey }) => decodePrizeTrackingTicket(account.data, pubkey),
    ),

    safetyDepositConfigs: createProcessor(
      acc => isSafetyDepositConfigV1Account(acc),
      ({ account, pubkey }) => decodeSafetyDepositConfig(account.data, pubkey),
    ),

    stores: createProcessor(
      acc => isStoreV1Account(acc),
      ({ account, pubkey }) => decodeStore(account.data, pubkey),
    ),
    creators: createProcessor(
      acc => isWhitelistedCreatorV1Account(acc),
      ({ account, pubkey }) => decodeWhitelistedCreator(account.data, pubkey),
    ),
  },
  isMetaplexAccount,
);
