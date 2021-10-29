import {
  BIDDER_METADATA_LEN,
  BIDDER_POT_LEN,
  decodeAuction,
  decodeAuctionDataExtended,
  decodeBidderMetadata,
  decodeBidderPot,
  MAX_AUCTION_DATA_EXTENDED_SIZE,
} from '../models/auctions';
import { AUCTION_ID } from '../utils';
import { CheckAccountFunc } from './types';
import { createPipeline, createProcessor } from './utils';

const isAuctionAccount: CheckAccountFunc = account =>
  account.owner === AUCTION_ID;

const isExtendedAuctionAccount: CheckAccountFunc = account =>
  account.data.length === MAX_AUCTION_DATA_EXTENDED_SIZE;

const isBidderMetadataAccount: CheckAccountFunc = account =>
  account.data.length === BIDDER_METADATA_LEN;

const isBidderPotAccount: CheckAccountFunc = account =>
  account.data.length === BIDDER_POT_LEN;

export const AUCTION_PROCESSOR = createPipeline(
  {
    auctions: createProcessor(
      () => true,
      ({ account, pubkey }) => decodeAuction(account.data, pubkey),
    ),
    auctionsDataExtended: createProcessor(
      acc => isExtendedAuctionAccount(acc),
      ({ account, pubkey }) => decodeAuctionDataExtended(account.data, pubkey),
    ),
    bidderMetadatas: createProcessor(
      acc => isBidderMetadataAccount(acc),
      ({ account, pubkey }) => decodeBidderMetadata(account.data, pubkey),
    ),
    bidderPots: createProcessor(
      acc => isBidderPotAccount(acc),
      ({ account, pubkey }) => decodeBidderPot(account.data, pubkey),
    ),
  },
  isAuctionAccount,
);
