import { Connection } from '@solana/web3.js';
import { ProcessAccountsFunc } from '.';
import { toPublicKey, StringPublicKey } from '../../utils';
import { makeSetter } from './loadAccounts';
import { onChangeAccount } from './onChangeAccount';
import { getEmptyMetaState } from './getEmptyMetaState';
import { MetaState, UpdateStateValueFunc } from './types';

interface ProgramListener {
  programId: StringPublicKey;
  processAccount: ProcessAccountsFunc;
}

export const subscribeProgramChanges = (
  connection: Connection,
  patchState: (state: Partial<MetaState>) => void,
  ...args: ProgramListener[]
) => {
  const updateStateValue: UpdateStateValueFunc = (prop, key, value) => {
    const state = getEmptyMetaState();

    makeSetter(state)(prop, key, value);

    patchState(state);
  };

  let listeners = args.map(({ programId, processAccount }) => {
    const listenerId = connection.onProgramAccountChange(
      toPublicKey(programId),
      onChangeAccount(processAccount, updateStateValue),
    );

    console.log(
      `listening to program changes for ${programId} with listener ${listenerId}`,
    );

    return listenerId;
  });

  return () => {
    listeners.forEach(subscriptionId => {
      console.log('ending subscription: ', subscriptionId);

      connection.removeProgramAccountChangeListener(subscriptionId);
    });

    listeners = [];

    console.log('All listeners closed', listeners.length);
  };
};
