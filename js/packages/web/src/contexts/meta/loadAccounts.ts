import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  VAULT_ID,
} from '@oyster/common/dist/lib/utils/ids';
import { Connection, PublicKey } from '@solana/web3.js';
import { AccountAndPubkey, MetaState, ProcessAccountsFunc } from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import {
  findProgramAddress,
  getEdition,
  getMultipleAccounts,
  MAX_CREATOR_LEN,
  MAX_CREATOR_LIMIT,
  MAX_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_URI_LENGTH,
  Metadata,
  METADATA_PREFIX,
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

  const additionalPromises: Promise<void>[] = [];

  const promises = [
    connection.getProgramAccounts(VAULT_ID).then(forEach(processVaultData)),
    connection.getProgramAccounts(AUCTION_ID).then(forEach(processAuctions)),
    ,
    connection
      .getProgramAccounts(METAPLEX_ID)
      .then(forEach(processMetaplexAccounts)),
    connection
      .getProgramAccounts(METAPLEX_ID, {
        filters: [
          {
            dataSize: MAX_WHITELISTED_CREATOR_SIZE,
          },
        ],
      })
      .then(async creators => {
        await forEach(processMetaplexAccounts)(creators);

        const whitelistedCreators = Object.values(
          tempCache.whitelistedCreatorsByCreator,
        );

        if (whitelistedCreators.length > 3) {
          console.log(' too many creators, pulling all nfts in one go');
          additionalPromises.push(
            connection
              .getProgramAccounts(METADATA_PROGRAM_ID)
              .then(forEach(processMetaData)),
          );
        } else {
          console.log('pulling optimized nfts');

          for (let i = 0; i < MAX_CREATOR_LIMIT; i++) {
            for (let j = 0; j < whitelistedCreators.length; j++) {
              additionalPromises.push(
                connection
                  .getProgramAccounts(METADATA_PROGRAM_ID, {
                    filters: [
                      {
                        memcmp: {
                          offset:
                            1 + // key
                            32 + // update auth
                            32 + // mint
                            4 + // name string length
                            MAX_NAME_LENGTH + // name
                            4 + // uri string length
                            MAX_URI_LENGTH + // uri
                            4 + // symbol string length
                            MAX_SYMBOL_LENGTH + // symbol
                            2 + // seller fee basis points
                            1 + // whether or not there is a creators vec
                            4 + // creators vec length
                            i * MAX_CREATOR_LEN,
                          bytes: whitelistedCreators[j].info.address.toBase58(),
                        },
                      },
                    ],
                  })
                  .then(forEach(processMetaData)),
              );
            }
          }
        }
      }),
  ];
  await Promise.all(promises);
  await Promise.all(additionalPromises);

  await postProcessMetadata(tempCache, all);
  console.log('Metadata size', tempCache.metadata.length);

  if (additionalPromises.length > 0) {
    console.log('Pulling editions for optimized metadata');
    let setOf100MetadataEditionKeys: string[] = [];
    const editionPromises = [];

    for (let i = 0; i < tempCache.metadata.length; i++) {
      let edition: PublicKey;
      if (tempCache.metadata[i].info.editionNonce != null) {
        edition = await PublicKey.createProgramAddress(
          [
            Buffer.from(METADATA_PREFIX),
            METADATA_PROGRAM_ID.toBuffer(),
            tempCache.metadata[i].info.mint.toBuffer(),
            new Uint8Array([tempCache.metadata[i].info.editionNonce || 0]),
          ],
          METADATA_PROGRAM_ID,
        );
      } else {
        edition = await getEdition(tempCache.metadata[i].info.mint);
      }

      setOf100MetadataEditionKeys.push(edition.toBase58());

      if (setOf100MetadataEditionKeys.length >= 100) {
        editionPromises.push(
          getMultipleAccounts(
            connection,
            setOf100MetadataEditionKeys,
            'recent',
          ),
        );
        setOf100MetadataEditionKeys = [];
      }
    }

    const responses = await Promise.all(editionPromises);
    for (let i = 0; i < responses.length; i++) {
      const returnedAccounts = responses[i];
      for (let j = 0; j < returnedAccounts.array.length; j++) {
        processMetaData(
          {
            pubkey: new PublicKey(returnedAccounts.keys[j]),
            account: returnedAccounts.array[j],
          },
          updateTemp,
          all,
        );
      }
    }
    console.log(
      'Edition size',
      Object.keys(tempCache.editions).length,
      Object.keys(tempCache.masterEditions).length,
    );
  }

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
