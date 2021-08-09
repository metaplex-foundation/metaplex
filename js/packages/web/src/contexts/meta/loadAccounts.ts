import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  VAULT_ID,
} from '@oyster/common/dist/lib/utils/ids';
import { Connection } from '@solana/web3.js';
import { AccountAndPubkey, MetaState } from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import { Metadata, ParsedAccount } from '../../../../common/dist/lib';

export const loadAccounts = async (connection: Connection) => {
  const accounts = (
    await Promise.all([
      connection.getProgramAccounts(VAULT_ID),
      connection.getProgramAccounts(AUCTION_ID),
      connection.getProgramAccounts(METAPLEX_ID),
      connection.getProgramAccounts(METADATA_PROGRAM_ID),
    ])
  ).flat();

  return accounts;
};

export const processAccounts = async (
  accounts: AccountAndPubkey[],
  all: boolean,
) => {
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

  for (const account of accounts) {
    processVaultData(account, updateTemp, all);
    processAuctions(account, updateTemp, all);
    processMetaData(account, updateTemp, all);
    await processMetaplexAccounts(account, updateTemp, all);
  }

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
