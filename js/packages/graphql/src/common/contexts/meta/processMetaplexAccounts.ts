import {
  AuctionManagerV1,
  AuctionManagerV2,
  BidRedemptionTicket,
  BidRedemptionTicketV2,
  decodeAuctionManager,
  decodeBidRedemptionTicket,
  decodePayoutTicket,
  decodePrizeTrackingTicket,
  decodeSafetyDepositConfig,
  decodeStore,
  decodeWhitelistedCreator,
  MetaplexKey,
  PayoutTicket,
  PrizeTrackingTicket,
  SafetyDepositConfig,
  Store,
  WhitelistedCreator,
} from "../../models/metaplex";
import logger from "../../../logger";
import { ProcessAccountsFunc } from "./types";
import { METAPLEX_ID, AccountInfoOwnerString } from "../../utils";
import { ParsedAccount } from "../accounts/types";

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
      const auctionManager = decodeAuctionManager(account.data);

      const parsedAccount: ParsedAccount<AuctionManagerV1 | AuctionManagerV2> =
        {
          pubkey,
          info: auctionManager,
        };
      setter("auctionManagersByAuction", auctionManager.auction, parsedAccount);
    }

    if (
      isBidRedemptionTicketV1Account(account) ||
      isBidRedemptionTicketV2Account(account)
    ) {
      const ticket = decodeBidRedemptionTicket(account.data);
      const parsedAccount: ParsedAccount<BidRedemptionTicket> = {
        pubkey,
        info: ticket,
      };
      setter("bidRedemptions", pubkey, parsedAccount);

      if (ticket.key == MetaplexKey.BidRedemptionTicketV2) {
        const asV2 = ticket as BidRedemptionTicketV2;
        if (asV2.winnerIndex) {
          setter(
            "bidRedemptionV2sByAuctionManagerAndWinningIndex",
            asV2.auctionManager + "-" + asV2.winnerIndex.toNumber(),
            parsedAccount
          );
        }
      }
    }

    if (isPayoutTicketV1Account(account)) {
      const ticket = decodePayoutTicket(account.data);
      const parsedAccount: ParsedAccount<PayoutTicket> = {
        pubkey,
        info: ticket,
      };
      setter("payoutTickets", pubkey, parsedAccount);
    }

    if (isPrizeTrackingTicketV1Account(account)) {
      const ticket = decodePrizeTrackingTicket(account.data);
      const parsedAccount: ParsedAccount<PrizeTrackingTicket> = {
        pubkey,
        info: ticket,
      };
      setter("prizeTrackingTickets", pubkey, parsedAccount);
    }

    if (isStoreV1Account(account)) {
      const store = decodeStore(account.data);
      const parsedAccount: ParsedAccount<Store> = {
        pubkey,
        info: store,
      };
      setter("stores", pubkey, parsedAccount);
    }

    if (isSafetyDepositConfigV1Account(account)) {
      const config = decodeSafetyDepositConfig(account.data);
      const parsedAccount: ParsedAccount<SafetyDepositConfig> = {
        pubkey,
        info: config,
      };
      setter(
        "safetyDepositConfigsByAuctionManagerAndIndex",
        config.auctionManager + "-" + config.order.toNumber(),
        parsedAccount
      );
    }

    if (isWhitelistedCreatorV1Account(account)) {
      const creator = decodeWhitelistedCreator(account.data);
      const parsedAccount: ParsedAccount<WhitelistedCreator> = {
        pubkey,
        info: creator,
      };
      setter(
        "creators",
        parsedAccount.info.address + "-" + pubkey,
        parsedAccount
      );
    }
  } catch (err) {
    logger.error(err);
    // ignore errors
    // add type as first byte for easier deserialization
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
