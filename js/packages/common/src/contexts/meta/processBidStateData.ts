import { BidStateData, BidStateDataParser } from '../../actions';
import { AUCTION_ID, pubkeyToString } from '../../utils';
import { ParsedAccount } from '../accounts';
import { cache } from '../accounts';
import { CheckAccountFunc, ProcessAccountsFunc } from './types';

export const processBidStateData: ProcessAccountsFunc = (
  { account, pubkey },
  setter,
) => {
  if (!isAuctionAccount(account)) return;

  try {
    const parsedAccount = cache.add(
      pubkey,
      account,
      BidStateDataParser,
      false,
    ) as ParsedAccount<BidStateData>;
    setter(
      'bidStateDataByAuction',
      parsedAccount.info.auctionKey,
      parsedAccount,
    );
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isAuctionAccount: CheckAccountFunc = account =>
  account && pubkeyToString(account.owner) === AUCTION_ID;
