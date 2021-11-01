import { Connection } from '@solana/web3.js';
import { getEmptyMetaState } from '.';
import { AUCTION_ID, METAPLEX_ID, toPublicKey, VAULT_ID } from '../../utils';
import { makeSetter } from './loadAccounts';
import { onChangeAccount } from './onChangeAccount';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processVaultData } from './processVaultData';
import { MetaState, UpdateStateValueFunc } from './types';

export const subscribeAccountsChange = (
  connection: Connection,
  patchState: (state: Partial<MetaState>) => void,
) => {
  const subscriptions: number[] = [];

  const updateStateValue: UpdateStateValueFunc = (prop, key, value) => {
    const state = getEmptyMetaState();

    makeSetter(state)(prop, key, value);

    patchState(state);
  };

  subscriptions.push(
    connection.onProgramAccountChange(
      toPublicKey(VAULT_ID),
      onChangeAccount(processVaultData, updateStateValue),
    ),
  );

  subscriptions.push(
    connection.onProgramAccountChange(
      toPublicKey(AUCTION_ID),
      onChangeAccount(processAuctions, updateStateValue),
    ),
  );

  subscriptions.push(
    connection.onProgramAccountChange(
      toPublicKey(METAPLEX_ID),
      onChangeAccount(processMetaplexAccounts, updateStateValue),
    ),
  );

  return () => {
    subscriptions.forEach(subscriptionId => {
      connection.removeProgramAccountChangeListener(subscriptionId);
    });
  };
};
