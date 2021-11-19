import { merge, uniqWith } from 'lodash';
import React, { ReactNode, useContext, useEffect, useState } from 'react';
import { useConnection } from '../connection';
import { useStore } from '../store';
import { getEmptyMetaState } from './getEmptyMetaState';
import { loadAccounts } from './loadAccounts';
import { ParsedAccount } from '../accounts/types';
import { Metadata } from '../../actions';
import { MetaContextState, MetaState } from './types';

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

  const [isLoading, setIsLoading] = useState(true);

  const patchState: MetaContextState['patchState'] = (
    ...args: Partial<MetaState>[]
  ) => {
    setState(current => {
      const newState = merge({}, current, ...args, { store: current.store });

      const currentMetdata = current.metadata ?? [];
      const nextMetadata = args.reduce((memo, { metadata = [] }) => {
        return [...memo, ...metadata];
      }, [] as ParsedAccount<Metadata>[]);

      newState.metadata = uniqWith(
        [...currentMetdata, ...nextMetadata],
        (a, b) => a.pubkey === b.pubkey,
      );

      return newState;
    });
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

      const nextState = await loadAccounts(connection, ownerAddress);

      setState(nextState);

      setIsLoading(false);
    })();
  }, [storeAddress, isReady, ownerAddress]);

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
