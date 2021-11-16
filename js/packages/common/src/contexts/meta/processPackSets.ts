import { AccountInfo } from '@solana/web3.js';
import { PackKey } from '../..';
import { decodePackSet, PackSet } from '../../models/packs/accounts/PackSet';
import { PACK_CREATE_ID, pubkeyToString } from '../../utils';
import { ParsedAccount } from '../accounts/types';
import { ProcessAccountsFunc } from './types';

export const processPackSets: ProcessAccountsFunc = (
  { account, pubkey },
  setter,
) => {
  if (!isPackAccount(account)) return;

  try {
    if (isPackSetAccount(account)) {
      const packSet = decodePackSet(account.data);
      const parsedAccount: ParsedAccount<PackSet> = {
        pubkey,
        account: account,
        info: packSet,
      };

      setter('packs', pubkey, parsedAccount);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isPackAccount = (account: AccountInfo<Buffer>) =>
  account && pubkeyToString(account.owner) === PACK_CREATE_ID.toString();

const isPackSetAccount = (account: AccountInfo<Buffer>) =>
  account.data[0] === PackKey.PackSet;
