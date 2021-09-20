import { Connection } from '@solana/web3.js';
import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  toPublicKey,
  VAULT_ID,
} from '../../utils';
import { makeSetter, metadataByMintUpdater } from './loadAccounts';
import { onChangeAccount } from './onChangeAccount';
import { processAuctions } from './processAuctions';
import { processMetaData } from './processMetaData';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processVaultData } from './processVaultData';
import { MetaState, UpdateStateValueFunc } from './types';

export const subscribeAccountsChange = (
  connection: Connection,
  all: boolean,
  getState: () => MetaState,
  setState: (v: MetaState) => void,
) => {
  const subscriptions: number[] = [];

  const updateStateValue: UpdateStateValueFunc = (prop, key, value) => {
    const state = getState();
    const nextState = makeSetter({ ...state })(prop, key, value);
    setState(nextState);
  };

  subscriptions.push(
    connection.onProgramAccountChange(
      toPublicKey(VAULT_ID),
      onChangeAccount(processVaultData, updateStateValue, all),
    ),
  );

  subscriptions.push(
    connection.onProgramAccountChange(
      toPublicKey(AUCTION_ID),
      onChangeAccount(processAuctions, updateStateValue, all),
    ),
  );

  subscriptions.push(
    connection.onProgramAccountChange(
      toPublicKey(METAPLEX_ID),
      onChangeAccount(processMetaplexAccounts, updateStateValue, all),
    ),
  );

  subscriptions.push(
    connection.onProgramAccountChange(
      toPublicKey(METADATA_PROGRAM_ID),
      onChangeAccount(
        processMetaData,
        async (prop, key, value) => {
          if (prop === 'metadataByMint') {
            const state = getState();
            const nextState = await metadataByMintUpdater(value, state, all);
            setState(nextState);
          } else {
            updateStateValue(prop, key, value);
          }
        },
        all,
      ),
    ),
  );

  return () => {
    subscriptions.forEach(subscriptionId => {
      connection.removeProgramAccountChangeListener(subscriptionId);
    });
  };
};
