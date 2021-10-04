import {
  AuctionData,
  AuctionDataExtended,
  AuctionDataExtendedParser,
  AuctionParser,
  BidderMetadata,
  BidderMetadataParser,
  BidderPot,
  BidderPotParser,
  BIDDER_METADATA_LEN,
  BIDDER_POT_LEN,
  MAX_AUCTION_DATA_EXTENDED_SIZE,
} from '../../actions';
import { AUCTION_ID, pubkeyToString } from '../../utils';
import { ParsedAccount } from '../accounts';
import { cache } from '../accounts';
import { CheckAccountFunc, ProcessAccountsFunc } from './types';

export const processAuctions: ProcessAccountsFunc = (
  { account, pubkey },
  setter,
) => {
  if (!isAuctionAccount(account)) return;

  try {
    const parsedAccount = cache.add(
      pubkey,
      account,
      AuctionParser,
      false,
    ) as ParsedAccount<AuctionData>;
    setter('auctions', pubkey, parsedAccount);
  } catch (e) {
    // ignore errors
    // add type as first byte for easier deserialization
  }

  try {
    if (isExtendedAuctionAccount(account)) {
      const parsedAccount = cache.add(
        pubkey,
        account,
        AuctionDataExtendedParser,
        false,
      ) as ParsedAccount<AuctionDataExtended>;
      setter('auctionDataExtended', pubkey, parsedAccount);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }

  try {
    if (isBidderMetadataAccount(account)) {
      const parsedAccount = cache.add(
        pubkey,
        account,
        BidderMetadataParser,
        false,
      ) as ParsedAccount<BidderMetadata>;
      setter(
        'bidderMetadataByAuctionAndBidder',
        parsedAccount.info.auctionPubkey +
          '-' +
          parsedAccount.info.bidderPubkey,
        parsedAccount,
      );
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }

  try {
    if (isBidderPotAccount(account)) {
      const parsedAccount = cache.add(
        pubkey,
        account,
        BidderPotParser,
        false,
      ) as ParsedAccount<BidderPot>;
      setter(
        'bidderPotsByAuctionAndBidder',
        parsedAccount.info.auctionAct + '-' + parsedAccount.info.bidderAct,
        parsedAccount,
      );
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isAuctionAccount: CheckAccountFunc = account =>
  pubkeyToString(account.owner) === AUCTION_ID;

const isExtendedAuctionAccount: CheckAccountFunc = account =>
  account.data.length === MAX_AUCTION_DATA_EXTENDED_SIZE;

const isBidderMetadataAccount: CheckAccountFunc = account =>
  account.data.length === BIDDER_METADATA_LEN;

const isBidderPotAccount: CheckAccountFunc = account =>
  account.data.length === BIDDER_POT_LEN;
