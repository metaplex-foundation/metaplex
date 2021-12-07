import { AccountInfo } from '@solana/web3.js';
import { PackKey } from '../..';
import {
  decodePackVoucher,
  PackVoucher,
} from '../../models/packs/accounts/PackVoucher';
import { PACK_CREATE_ID, pubkeyToString } from '../../utils';
import { ParsedAccount } from '../accounts/types';
import { ProcessAccountsFunc } from './types';

export const processPackVouchers: ProcessAccountsFunc = (
  { account, pubkey },
  setter,
) => {
  if (!isPackAccount(account)) return;

  try {
    if (isPackVoucherAccount(account)) {
      const packVoucher = decodePackVoucher(account.data);
      const parsedAccount: ParsedAccount<PackVoucher> = {
        pubkey,
        account: account,
        info: packVoucher,
      };

      setter('vouchers', pubkey, parsedAccount);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isPackAccount = (account: AccountInfo<Buffer>) =>
  account && pubkeyToString(account.owner) === PACK_CREATE_ID.toString();

const isPackVoucherAccount = (account: AccountInfo<Buffer>) =>
  account.data[0] === PackKey.PackVoucher;
