import React, { useCallback, useContext, useEffect, useState } from 'react';
import { queryExtendedMetadata } from './queryExtendedMetadata';
import { subscribeAccountsChange } from './subscribeAccountsChange';
import { getEmptyMetaState } from './getEmptyMetaState';
import { loadAccounts } from './loadAccounts';
import { MetaContextState, MetaState } from './types';
import { useConnection } from '../connection';
import { useStore } from '../store';
import { useQuerySearch } from '../../hooks';

const MetaContext = React.createContext<MetaContextState>({
  ...getEmptyMetaState(),
  isLoading: false,
});

export function MetaProvider({ children = null as any }) {
  const connection = useConnection();
  const { isReady, storeAddress } = useStore();
  const searchParams = useQuerySearch();
  const all = searchParams.get('all') == 'true';

  const [state, setState] = useState<MetaState>(getEmptyMetaState());

  const [isLoading, setIsLoading] = useState(true);

  const updateMints = useCallback(
    async metadataByMint => {
      try {
        if (!all) {
          const { metadata, mintToMetadata } = await queryExtendedMetadata(
            connection,
            metadataByMint,
          );
          setState(current => ({
            ...current,
            metadata,
            metadataByMint: mintToMetadata,
          }));
        }
      } catch (er) {
        console.error(er);
      }
    },
    [setState],
  );

  useEffect(() => {
    (async () => {
      if (!storeAddress) {
        if (isReady) {
          setIsLoading(false);
        }
        return;
      } else if (!state.store) {
        setIsLoading(true);
      }

      console.log('-----> Query started');

      const nextState = await loadAccounts(connection, all);

      console.log('------->Query finished');

      setState(nextState);

      setIsLoading(false);
      console.log('------->set finished');

      updateMints(nextState.metadataByMint);
    })();
  }, [connection, setState, updateMints, storeAddress, isReady]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    return subscribeAccountsChange(connection, all, () => state, setState);
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
