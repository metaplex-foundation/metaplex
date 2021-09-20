import {
  AuctionData,
  AuctionDataExtended,
  BidderMetadata,
  BidderPot,
  BIDDER_METADATA_LEN,
  BIDDER_POT_LEN,
  MAX_AUCTION_DATA_EXTENDED_SIZE,
  decodeAuction,
  decodeAuctionDataExtended,
  decodeBidderMetadata,
  decodeBidderPot,
} from "../../actions";
import { AUCTION_ID, pubkeyToString } from "../../utils";
import { ParsedAccount } from "../accounts/types";
import { CheckAccountFunc, ProcessAccountsFunc } from "./types";

export const processAuctions: ProcessAccountsFunc = (
  { account, pubkey },
  setter
) => {
  if (!isAuctionAccount(account)) return;

  try {
    const auction = decodeAuction(account.data);
    const parsedAccount: ParsedAccount<AuctionData> = { pubkey, info: auction };
    setter("auctions", pubkey, parsedAccount);
  } catch (e) {
    // ignore errors
    // add type as first byte for easier deserialization
  }

  try {
    if (isExtendedAuctionAccount(account)) {
      const extendedAuction = decodeAuctionDataExtended(account.data);

      const parsedAccount: ParsedAccount<AuctionDataExtended> = {
        pubkey,
        info: extendedAuction,
      };
      setter("auctionDataExtended", pubkey, parsedAccount);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }

  try {
    if (isBidderMetadataAccount(account)) {
      const bidderMetadata = decodeBidderMetadata(account.data);
      const parsedAccount: ParsedAccount<BidderMetadata> = {
        pubkey,
        info: bidderMetadata,
      };
      setter(
        "bidderMetadataByAuctionAndBidder",
        parsedAccount.info.auctionPubkey +
          "-" +
          parsedAccount.info.bidderPubkey,
        parsedAccount
      );
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }

  try {
    if (isBidderPotAccount(account)) {
      const bidderPot = decodeBidderPot(account.data);
      const parsedAccount: ParsedAccount<BidderPot> = {
        pubkey,
        info: bidderPot,
      };
      setter(
        "bidderPotsByAuctionAndBidder",
        parsedAccount.info.auctionAct + "-" + parsedAccount.info.bidderAct,
        parsedAccount
      );
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isAuctionAccount: CheckAccountFunc = (account) =>
  pubkeyToString(account.owner) === AUCTION_ID;

const isExtendedAuctionAccount: CheckAccountFunc = (account) =>
  account.data.length === MAX_AUCTION_DATA_EXTENDED_SIZE;

const isBidderMetadataAccount: CheckAccountFunc = (account) =>
  account.data.length === BIDDER_METADATA_LEN;

const isBidderPotAccount: CheckAccountFunc = (account) =>
  account.data.length === BIDDER_POT_LEN;
