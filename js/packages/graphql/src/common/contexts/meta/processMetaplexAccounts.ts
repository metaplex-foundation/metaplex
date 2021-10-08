import {
  decodeAuctionManager,
  decodeBidRedemptionTicket,
  decodePayoutTicket,
  decodePrizeTrackingTicket,
  decodeSafetyDepositConfig,
  decodeStore,
  decodeWhitelistedCreator,
  MetaplexKey,
} from "../../models/metaplex";
import logger from "../../../logger";
import { ProcessAccountsFunc } from "./types";
import { METAPLEX_ID, AccountInfoOwnerString } from "../../utils";

export const processMetaplexAccounts: ProcessAccountsFunc = async (
  { account, pubkey },
  setter
) => {
  if (!isMetaplexAccount(account)) return;

  try {
    if (
      isAuctionManagerV1Account(account) ||
      isAuctionManagerV2Account(account)
    ) {
      const auctionManager = decodeAuctionManager(account.data, pubkey);
      await setter("auctionManagers", pubkey, auctionManager);
    }

    if (
      isBidRedemptionTicketV1Account(account) ||
      isBidRedemptionTicketV2Account(account)
    ) {
      const ticket = decodeBidRedemptionTicket(account.data);
      await setter("bidRedemptions", pubkey, ticket);
    }

    if (isPayoutTicketV1Account(account)) {
      const ticket = decodePayoutTicket(account.data, pubkey);
      await setter("payoutTickets", pubkey, ticket);
    }

    if (isPrizeTrackingTicketV1Account(account)) {
      const ticket = decodePrizeTrackingTicket(account.data, pubkey);
      await setter("prizeTrackingTickets", pubkey, ticket);
    }

    if (isSafetyDepositConfigV1Account(account)) {
      const config = decodeSafetyDepositConfig(account.data);
      await setter("safetyDepositConfigs", pubkey, config);
    }

    if (isStoreV1Account(account)) {
      const store = decodeStore(account.data, pubkey);
      await setter("stores", pubkey, store);
    }

    if (isWhitelistedCreatorV1Account(account)) {
      const creator = decodeWhitelistedCreator(account.data, pubkey);
      await setter("creators", pubkey, creator);
    }
  } catch (err) {
    logger.warn(err);
  }
};

const isMetaplexAccount = (account: AccountInfoOwnerString<Buffer>) =>
  account.owner === METAPLEX_ID;

const isAuctionManagerV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.AuctionManagerV1;

const isAuctionManagerV2Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.AuctionManagerV2;

const isBidRedemptionTicketV1Account = (
  account: AccountInfoOwnerString<Buffer>
) => account.data[0] === MetaplexKey.BidRedemptionTicketV1;

const isBidRedemptionTicketV2Account = (
  account: AccountInfoOwnerString<Buffer>
) => account.data[0] === MetaplexKey.BidRedemptionTicketV2;

const isPayoutTicketV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.PayoutTicketV1;

const isPrizeTrackingTicketV1Account = (
  account: AccountInfoOwnerString<Buffer>
) => account.data[0] === MetaplexKey.PrizeTrackingTicketV1;

const isStoreV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === MetaplexKey.StoreV1;

const isSafetyDepositConfigV1Account = (
  account: AccountInfoOwnerString<Buffer>
) => account.data[0] === MetaplexKey.SafetyDepositConfigV1;

const isWhitelistedCreatorV1Account = (
  account: AccountInfoOwnerString<Buffer>
) => account.data[0] === MetaplexKey.WhitelistedCreatorV1;
