import { AccountInfo } from '@solana/web3.js';
import { PackKey } from '../..';
import {
  ProvingProcess,
  decodePackProvingProcess,
} from '../../models/packs/accounts/ProvingProcess';
import { PACK_CREATE_ID, pubkeyToString } from '../../utils';
import { ParsedAccount } from '../accounts/types';
import { ProcessAccountsFunc } from './types';

export const processProvingProcess: ProcessAccountsFunc = (
  { account, pubkey },
  setter,
) => {
  if (!isPackAccount(account)) return;

  try {
    if (isPackProvingProcessAccount(account)) {
      const provingProcess = decodePackProvingProcess(account.data);
      const parsedAccount: ParsedAccount<ProvingProcess> = {
        pubkey,
        account: account,
        info: provingProcess,
      };

      setter('provingProcesses', pubkey, parsedAccount);
    }
  } catch {
    // ignore errors
    // add type as first byte for easier deserialization
  }
};

const isPackAccount = (account: AccountInfo<Buffer>) =>
  account && pubkeyToString(account.owner) === PACK_CREATE_ID.toString();

const isPackProvingProcessAccount = (account: AccountInfo<Buffer>) =>
  account.data[0] === PackKey.ProvingProcess;
