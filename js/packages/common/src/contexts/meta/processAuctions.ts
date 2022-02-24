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
const AUCTION_BLOCK_LIST = [
  '9zcrbzSmBPdDjAGYXkfufP2wy1kbHKac8UYLBmHpbuYy',
  'DzR58tU6ZXx2sMBVjaL2dhNF9SL9qd42eYXLbtu5qcCx',
  '5c87cDHxwiF3jeapwrYEtJjCxoddMrRKRwrFh7NAATtg',
  'BrHimLGmvsGqVrQQxHQH1vrU9srodpwjYipr51Dh2kq7',
  'Hg94dq2qJ4bdvq1ttvtXWRnvG4ZRW3xZBqY83cHJjjsz',
  '3cvup2CrUPjhPuyPrGYbNExg6wWdAhMnQ7Fzy4gwL4mP',
  'BJRYaWyTtj93LkS5tZ6Bqo9em3oFXjASXPC1Z4xDH6s9',
  'EVa8npkseLJGW5pi2QTJkURX8huFcdtSYEQUupebpxGk',
  'Px79FbkMahpELmzj5qvqobfVmqGZMS3G1BQJPeugETM',
];

export const processAuctions: ProcessAccountsFunc = async (
  { account, pubkey },
  setter,
) => {
  if (!isAuctionAccount(account) || isOnBlockList(pubkey)) return;

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

const isOnBlockList = (pubkey: string) => AUCTION_BLOCK_LIST.includes(pubkey);

const isAuctionAccount: CheckAccountFunc = account =>
  pubkeyToString(account?.owner) === AUCTION_ID;

const isExtendedAuctionAccount: CheckAccountFunc = account =>
  account.data.length === MAX_AUCTION_DATA_EXTENDED_SIZE;

const isBidderMetadataAccount: CheckAccountFunc = account =>
  account.data.length === BIDDER_METADATA_LEN;

const isBidderPotAccount: CheckAccountFunc = account =>
  account.data.length === BIDDER_POT_LEN;
