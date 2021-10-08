import React, { useCallback, useContext, useEffect, useState } from 'react';
import { subscribeAccountsChange } from './subscribeAccountsChange';
import { getEmptyMetaState } from './getEmptyMetaState';
import {
  loadAccounts,
} from './loadAccounts';
import { Spin, Space } from 'antd';
import { merge, uniqWith } from 'lodash'
import { MetaContextState, MetaState } from './types';
import { useConnection } from '../connection';
import { useStore } from '../store';
import { LoadingOutlined } from '@ant-design/icons';

const MetaContext = React.createContext<MetaContextState>({
  ...getEmptyMetaState(),
  isLoading: false,
  patchState: () => {
    throw new Error('unreachable');
  },
});

export function MetaProvider({ children = null as any }) {
  const connection = useConnection();
  const { isReady, storeAddress, ownerAddress, storefront } = useStore();

  const [state, setState] = useState<MetaState>(getEmptyMetaState());

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
  
      console.log('-----> Query started');
  
      const nextState = await loadAccounts(connection, ownerAddress)
  
      console.log('------->Query finished');
  
      setState(nextState);
  
      setIsLoading(false);
      console.log('------->set finished');
  
    })()
  }, [storeAddress, isReady, ownerAddress]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    return subscribeAccountsChange(connection, patchState);
  }, [connection, setState, isLoading]);

  // TODO: fetch names dynamically
  // TODO: get names for creators
  // useEffect(() => {
  //   (async () => {
  //     const twitterHandles = await connection.getProgramAccounts(NAME_PROGRAM_ID, {
  //      filters: [
  //        {
  //           dataSize: TWITTER_ACCOUNT_LENGTH,
  //        },
  //        {
  //          memcmp: {
  //           offset: VERIFICATION_AUTHORITY_OFFSET,
  //           bytes: TWITTER_VERIFICATION_AUTHORITY.toBase58()
  //          }
  //        }
  //      ]
  //     });

  //     const handles = twitterHandles.map(t => {
  //       const owner = new PublicKey(t.account.data.slice(32, 64));
  //       const name = t.account.data.slice(96, 114).toString();
  //     });

  //     console.log(handles);

  //   })();
  // }, [whitelistedCreatorsByCreator]);

  return (
    <MetaContext.Provider
      value={{
        ...state,
        patchState,
        isLoading,
      }}
    >
      {isLoading ? (
        <div className="app--loading">
          <Space direction="vertical" size="middle">
            <img src={storefront.theme.logo} className="app--loading-logo" />
            <Spin indicator={<LoadingOutlined />} />
          </Space>
        </div>
      ) : children}
    </MetaContext.Provider>
  );
}

export const useMeta = () => {
  const context = useContext(MetaContext);
  return context;
};
