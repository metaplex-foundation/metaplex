import {
  KeyedAccountInfo,
  ProgramAccountChangeCallback,
} from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { ProcessAccountsFunc, UpdateStateValueFunc } from './types';

export const onChangeAccount =
  (
    process: ProcessAccountsFunc,
    setter: UpdateStateValueFunc,
  ): ProgramAccountChangeCallback =>
  async info => {
    const pubkey = pubkeyByAccountInfo(info);
    await process(
      {
        pubkey,
        account: info.accountInfo,
      },
      setter,
    );
  };

export const pubkeyByAccountInfo = (info: KeyedAccountInfo) => {
  return typeof info.accountId === 'string'
    ? new PublicKey(info.accountId as unknown as string)
    : info.accountId;
};
