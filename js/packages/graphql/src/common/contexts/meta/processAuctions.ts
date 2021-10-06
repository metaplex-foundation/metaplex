import {
  BIDDER_METADATA_LEN,
  BIDDER_POT_LEN,
  decodeAuction,
  decodeAuctionDataExtended,
  decodeBidderMetadata,
  decodeBidderPot,
  MAX_AUCTION_DATA_EXTENDED_SIZE,
} from "../../actions";
import { AUCTION_ID } from "../../utils";
import { CheckAccountFunc, ProcessAccountsFunc } from "./types";

export const processAuctions: ProcessAccountsFunc = async (
  { account, pubkey },
  setter
) => {
  if (!isAuctionAccount(account)) return;

  try {
    const auction = decodeAuction(account.data);
    await setter("auction", pubkey, auction);
  } catch {
    // ignore errors
  }

  try {
    if (isExtendedAuctionAccount(account)) {
      const extendedAuction = decodeAuctionDataExtended(account.data);
      await setter("auctionDataExtended", pubkey, extendedAuction);
    }
  } catch {
    // ignore errors
  }

  try {
    if (isBidderMetadataAccount(account)) {
      const bidderMetadata = decodeBidderMetadata(account.data);
      await setter("bidderMetadata", pubkey, bidderMetadata);
    }
  } catch {
    // ignore errors
  }

  try {
    if (isBidderPotAccount(account)) {
      const bidderPot = decodeBidderPot(account.data);
      await setter("bidderPot", pubkey, bidderPot);
    }
  } catch (err) {
    // ignore errors
  }
};

const isAuctionAccount: CheckAccountFunc = (account) =>
  account.owner === AUCTION_ID;

const isExtendedAuctionAccount: CheckAccountFunc = (account) =>
  account.data.length === MAX_AUCTION_DATA_EXTENDED_SIZE;

const isBidderMetadataAccount: CheckAccountFunc = (account) =>
  account.data.length === BIDDER_METADATA_LEN;

const isBidderPotAccount: CheckAccountFunc = (account) =>
  account.data.length === BIDDER_POT_LEN;
