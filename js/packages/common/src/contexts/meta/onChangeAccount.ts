import { ProgramAccountChangeCallback } from '@solana/web3.js';
import { pubkeyToString } from '../../utils';
import { ProcessAccountsFunc, UpdateStateValueFunc } from './types';

export const onChangeAccount =
  (
    process: ProcessAccountsFunc,
    setter: UpdateStateValueFunc,
  ): ProgramAccountChangeCallback =>
  async info => {
    const pubkey = pubkeyToString(info.accountId);
    await process(
      {
        pubkey,
        account: info.accountInfo,
      },
      setter,
    );
  };
