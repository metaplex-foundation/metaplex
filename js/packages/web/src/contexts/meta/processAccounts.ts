import { AccountAndPubkey, MetaState, UpdateStateValueFunc } from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';

export const processAccounts = async (accounts: AccountAndPubkey[]) => {
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
  };

  const updateTemp: UpdateStateValueFunc = (prop, key, value) => {
    if (prop === 'store') {
      tempCache[prop] = value;
    } else if (tempCache[prop]) {
      const bucket = tempCache[prop] as any;
      bucket[key] = value;
    }
  };

  for (const account of accounts) {
    processVaultData(account, updateTemp);
    processAuctions(account, updateTemp);
    processMetaData(account, updateTemp);
    await processMetaplexAccounts(account, updateTemp);
  }

  await postProcessMetadata(tempCache);

  return tempCache;
};

const postProcessMetadata = async (tempCache: MetaState) => {
  const values = Object.values(tempCache.metadataByMint);

  for (const metadata of values) {
    if (
      isMetadataPartOfStore(
        metadata,
        tempCache.store,
        tempCache.whitelistedCreatorsByCreator,
      )
    ) {
      await metadata.info.init();
      const masterEditionKey = metadata.info?.masterEdition?.toBase58();
      if (masterEditionKey) {
        tempCache.metadataByMasterEdition[masterEditionKey] = metadata;
      }

      tempCache.metadata.push(metadata);
    } else {
      delete tempCache.metadataByMint[metadata.info.mint.toBase58() || ''];
    }
  }

  return tempCache;
};
