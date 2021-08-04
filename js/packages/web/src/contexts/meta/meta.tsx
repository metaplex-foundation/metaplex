import {
  useConnection,
  setProgramIds,
  useConnectionConfig,
  AUCTION_ID,
  METAPLEX_ID,
  VAULT_ID,
  METADATA_PROGRAM_ID,
} from '@oyster/common';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  FC,
} from 'react';
import { loadMeta } from './loadMeta';
import { MetaState, MetaContextState, UpdateStateValueFunc } from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { queryExtendedMetadata } from './queryExtendedMetadata';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import { processAccounts } from './processAccounts';
import { onChangeAccount } from './onChangeAccount';
import { DEFAULT_ENDPOINT, deserializeAccounts } from './preloadMeta';

const MetaContext = React.createContext<MetaContextState>({
  metadata: [],
  metadataByMint: {},
  masterEditions: {},
  masterEditionsByPrintingMint: {},
  masterEditionsByOneTimeAuthMint: {},
  metadataByMasterEdition: {},
  editions: {},
  auctionManagersByAuction: {},
  auctions: {},
  auctionDataExtended: {},
  vaults: {},
  store: null,
  isLoading: false,
  bidderMetadataByAuctionAndBidder: {},
  safetyDepositBoxesByVaultAndIndex: {},
  bidderPotsByAuctionAndBidder: {},
  bidRedemptions: {},
  whitelistedCreatorsByCreator: {},
  payoutTickets: {},
  prizeTrackingTickets: {},
});

export const MetaProvider: FC<{ initAccounts?: any[] }> = ({
  children,
  initAccounts,
}) => {
  const connection = useConnection();
  const { env } = useConnectionConfig();

  const [state, setState] = useState<MetaState>({
    metadata: [],
    metadataByMint: {},
    masterEditions: {},
    masterEditionsByPrintingMint: {},
    masterEditionsByOneTimeAuthMint: {},
    metadataByMasterEdition: {},
    editions: {},
    auctionManagersByAuction: {},
    bidRedemptions: {},
    auctions: {},
    auctionDataExtended: {},
    vaults: {},
    payoutTickets: {},
    store: null,
    whitelistedCreatorsByCreator: {},
    bidderMetadataByAuctionAndBidder: {},
    bidderPotsByAuctionAndBidder: {},
    safetyDepositBoxesByVaultAndIndex: {},
    prizeTrackingTickets: {},
  });

  const [isLoading, setIsLoading] = useState(true);

  const updateMints = useCallback(
    async metadataByMint => {
      try {
        console.log('-----> update mints started');
        const m = await queryExtendedMetadata(connection, metadataByMint);
        console.log('-----> update mints finished');
        setState(current => ({
          ...current,
          metadata: m.metadata,
          metadataByMint: m.mintToMetadata,
        }));
      } catch (er) {
        console.error(er);
      }
    },
    [setState],
  );

  useEffect(() => {
    (async () => {
      let accounts;
      if (initAccounts && env === DEFAULT_ENDPOINT.name) {
        console.log('------> Use preloaded data');

        accounts = deserializeAccounts(initAccounts);
        initAccounts = undefined;
      } else {
        console.log('-----> Query started');

        accounts = await loadMeta(connection);

        console.log('------->Query finished');
      }

      await setProgramIds(env);
      const tempCache = await processAccounts(accounts);

      console.log('------->init finished');
      setState({
        ...tempCache,
      });

      setIsLoading(false);
      console.log('------->set finished');

      updateMints(tempCache.metadataByMint);
    })();
  }, [connection, setState, updateMints, env]);

  const updateStateValue = useMemo<UpdateStateValueFunc>(
    () => (prop, key, value) => {
      setState(current => {
        if (prop === 'store') {
          return {
            ...current,
            [prop]: value,
          };
        } else {
          return {
            ...current,
            [prop]: {
              ...current[prop],
              [key]: value,
            },
          };
        }
      });
    },
    [setState],
  );

  const store = state.store;
  const whitelistedCreatorsByCreator = state.whitelistedCreatorsByCreator;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let vaultSubId = connection.onProgramAccountChange(
      VAULT_ID,
      onChangeAccount(processVaultData, updateStateValue),
    );

    const auctionSubId = connection.onProgramAccountChange(
      AUCTION_ID,
      onChangeAccount(processAuctions, updateStateValue),
    );

    let metaplexSubId = connection.onProgramAccountChange(
      METAPLEX_ID,
      onChangeAccount(processMetaplexAccounts, updateStateValue),
    );

    let metaSubId = connection.onProgramAccountChange(
      METADATA_PROGRAM_ID,
      onChangeAccount(processMetaData, async (prop, key, value) => {
        if (prop === 'metadataByMint') {
          if (
            isMetadataPartOfStore(value, store, whitelistedCreatorsByCreator)
          ) {
            await value.info.init();
            setState(data => ({
              ...data,
              metadata: [
                ...data.metadata.filter(m => !m.pubkey.equals(value.pubkey)),
                value,
              ],
              metadataByMasterEdition: {
                ...data.metadataByMasterEdition,
                [value.info.masterEdition?.toBase58() || '']: value,
              },
              metadataByMint: {
                ...data.metadataByMint,
                [key]: value,
              },
            }));
          }
        } else {
          updateStateValue(prop, key, value);
        }
      }),
    );

    return () => {
      connection.removeProgramAccountChangeListener(vaultSubId);
      connection.removeProgramAccountChangeListener(metaplexSubId);
      connection.removeProgramAccountChangeListener(metaSubId);
      connection.removeProgramAccountChangeListener(auctionSubId);
    };
  }, [
    connection,
    updateStateValue,
    setState,
    store,
    whitelistedCreatorsByCreator,
    isLoading,
  ]);

  useEffect(() => {
    // TODO: fetch names dynamically
  });

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
};

export const useMeta = () => {
  const context = useContext(MetaContext);
  return context;
};
