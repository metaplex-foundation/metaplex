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
} from 'react';
import { MetaState, MetaContextState, UpdateStateValueFunc } from './types';
import { queryExtendedMetadata } from './queryExtendedMetadata';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import {
  loadAccounts,
  makeSetter,
  metadataByMintUpdater,
} from './loadAccounts';
import { onChangeAccount } from './onChangeAccount';

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
  safetyDepositConfigsByAuctionManagerAndIndex: {},
  bidRedemptionV2sByAuctionManagerAndWinningIndex: {},
  bidderPotsByAuctionAndBidder: {},
  bidRedemptions: {},
  whitelistedCreatorsByCreator: {},
  payoutTickets: {},
  prizeTrackingTickets: {},
  stores: {},
});

export function MetaProvider({ children = null as any }) {
  const connection = useConnection();
  const { env } = useConnectionConfig();
  const urlParams = new URLSearchParams(window.location.search);
  const all = urlParams.get('all') == 'true';

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
    safetyDepositConfigsByAuctionManagerAndIndex: {},
    bidRedemptionV2sByAuctionManagerAndWinningIndex: {},
    stores: {},
  });

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
      await setProgramIds(env);

      console.log('-----> Query started');

      const nextState = await loadAccounts(connection, all);

      console.log('------->Query finished');

      setState(nextState);

      setIsLoading(false);
      console.log('------->set finished');

      updateMints(nextState.metadataByMint);
    })();
  }, [connection, setState, updateMints, env]);

  const updateStateValue = useMemo<UpdateStateValueFunc>(
    () => (prop, key, value) => {
      setState(current => makeSetter({ ...current })(prop, key, value));
    },
    [setState],
  );

  const store = state.store;
  const whitelistedCreatorsByCreator = state.whitelistedCreatorsByCreator;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const vaultSubId = connection.onProgramAccountChange(
      VAULT_ID,
      onChangeAccount(processVaultData, updateStateValue, all),
    );

    const auctionSubId = connection.onProgramAccountChange(
      AUCTION_ID,
      onChangeAccount(processAuctions, updateStateValue, all),
    );

    const metaplexSubId = connection.onProgramAccountChange(
      METAPLEX_ID,
      onChangeAccount(processMetaplexAccounts, updateStateValue, all),
    );

    const metaSubId = connection.onProgramAccountChange(
      METADATA_PROGRAM_ID,
      onChangeAccount(
        processMetaData,
        async (prop, key, value) => {
          if (prop === 'metadataByMint') {
            const nextState = await metadataByMintUpdater(value, state, all);
            setState(nextState);
          } else {
            updateStateValue(prop, key, value);
          }
        },
        all,
      ),
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
