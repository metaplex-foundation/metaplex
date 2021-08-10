import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  VAULT_ID,
} from '@oyster/common/dist/lib/utils/ids';
import { Connection } from '@solana/web3.js';
import { AccountAndPubkey, MetaState, ProcessAccountsFunc } from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import {
  MAX_CREATOR_LEN,
  MAX_CREATOR_LIMIT,
  Metadata,
  ParsedAccount,
} from '../../../../common/dist/lib';
import {
  MAX_WHITELISTED_CREATOR_SIZE,
  MetaplexKey,
} from '../../models/metaplex';

export const loadAccounts = async (connection: Connection, all: boolean) => {
  const tempCache: MetaState = {
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
  };
  const updateTemp = makeSetter(tempCache);

  const forEach =
    (fn: ProcessAccountsFunc) => async (accounts: AccountAndPubkey[]) => {
      for (const account of accounts) {
        await fn(account, updateTemp, all);
      }
    };

  await connection
    .getProgramAccounts(METAPLEX_ID, {
      filters: [
        {
          dataSize: MAX_WHITELISTED_CREATOR_SIZE,
        },
        {
          memcmp: {
            offset: 0,
            bytes: MetaplexKey.WhitelistedCreatorV1.toString(),
          },
        },
      ],
    })
    .then(forEach(processMetaplexAccounts));

  const promises = [
    connection.getProgramAccounts(VAULT_ID).then(forEach(processVaultData)),
    connection.getProgramAccounts(AUCTION_ID).then(forEach(processAuctions)),
    ,
    connection
      .getProgramAccounts(METAPLEX_ID)
      .then(forEach(processMetaplexAccounts)),
  ];
  for (let i = 0; i < MAX_CREATOR_LIMIT; i++) {
    promises.push(
      connection
        .getProgramAccounts(METADATA_PROGRAM_ID, {
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: MetaplexKey.WhitelistedCreatorV1.toString(),
              },
            },
          ],
        })
        .then(forEach(processMetaData)),
    );
  }

  await Promise.all(promises);

  await postProcessMetadata(tempCache, all);

  return tempCache;
};

export const makeSetter =
  (state: MetaState) =>
  (prop: keyof MetaState, key: string, value: ParsedAccount<any>) => {
    if (prop === 'store') {
      state[prop] = value;
    } else if (prop !== 'metadata') {
      state[prop][key] = value;
    }
    return state;
  };

const postProcessMetadata = async (tempCache: MetaState, all: boolean) => {
  const values = Object.values(tempCache.metadataByMint);

  for (const metadata of values) {
    await metadataByMintUpdater(metadata, tempCache, all);
  }
};

export const metadataByMintUpdater = async (
  metadata: ParsedAccount<Metadata>,
  state: MetaState,
  all: boolean,
) => {
  const key = metadata.info.mint.toBase58();
  if (
    isMetadataPartOfStore(
      metadata,
      state.store,
      state.whitelistedCreatorsByCreator,
      all,
    )
  ) {
    await metadata.info.init();
    const masterEditionKey = metadata.info?.masterEdition?.toBase58();
    if (masterEditionKey) {
      state.metadataByMasterEdition[masterEditionKey] = metadata;
    }
    state.metadataByMint[key] = metadata;
    state.metadata.push(metadata);
  } else {
    delete state.metadataByMint[key];
  }
  return state;
};
