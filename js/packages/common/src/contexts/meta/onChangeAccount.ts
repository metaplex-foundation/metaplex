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
    const account =  info.accountInfo

    await process(
      {
        pubkey,
        account: {
          ...account,
          // to make sure these accounts get processed by processAuctions, processVaultData, etc
          owner: account.owner.toBase58() as unknown as any
        },
      },
      setter,
    );
  };
