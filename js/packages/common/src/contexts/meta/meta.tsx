import { merge, uniqWith } from 'lodash';
import React, {
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useConnection } from '../connection';
import { useStore } from '../store';
import { subscribeAccountsChange } from './subscribeAccountsChange';
import { getEmptyMetaState } from './getEmptyMetaState';
import {
  loadAccounts,
} from './loadAccounts';
import { MetaContextState, MetaState } from './types';
import { LoadingOutlined } from '@ant-design/icons';

const MetaContext = React.createContext<MetaContextState>({
  ...getEmptyMetaState(),
  isLoading: false,
  patchState: () => {
    throw new Error('unreachable');
  },
});

export function MetaProvider({ children = null }: { children: ReactNode }) {
  const connection = useConnection();
  const { isReady, storeAddress, ownerAddress } = useStore();

  const [state, setState] = useState<MetaState>(getEmptyMetaState());

  const { whitelistedCreatorsByCreator } = state;

  const [isLoading, setIsLoading] = useState(true);

  const patchState: MetaContextState['patchState'] = temp => {
    setState(current => {
      const newState = merge({}, current, temp);

      newState.store = temp.store ?? current.store;
  
      const currentMetdata = current.metadata ?? [];
      const nextMetadata = temp.metadata ?? [];
      newState.metadata = uniqWith(
        [...currentMetdata, ...nextMetadata],
        (a, b) => a.pubkey === b.pubkey
      );
        
      return newState
    })
  };

  useEffect(() => {
    (async () => {
      if (!storeAddress || !ownerAddress) {
        if (isReady) {
          setIsLoading(false);
        }
        return;
      } else if (!state.store) {
        setIsLoading(true);
      }
  
      const nextState = await loadAccounts(connection, ownerAddress)
  
      setState(nextState);
  
      setIsLoading(false);
    })()
  }, [storeAddress, isReady, ownerAddress]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    return subscribeAccountsChange(connection, whitelistedCreatorsByCreator, patchState);
  }, [isLoading]);


  return (
    <MetaContext.Provider
      value={{
        ...state,
        patchState,
        isLoading,
      }}
    >
      {children}
    </MetaContext.Provider>
  );
}

export const useMeta = () => {
  const context = useContext(MetaContext);
  return context;
};
