import { uniqWith, merge } from 'lodash';
import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  StringPublicKey,
  toPublicKey,
  VAULT_ID,
} from '../../utils/ids';
import { getStoreID } from '../../utils';
import { MAX_WHITELISTED_CREATOR_SIZE } from '../../models';
import {
  getEdition,
  Metadata,
  MAX_CREATOR_LEN,
  MAX_CREATOR_LIMIT,
  MAX_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_URI_LENGTH,
  METADATA_PREFIX,
  decodeMetadata,
  getAuctionExtended,
  getMetadata,
  SafetyDepositBox,
} from '../../actions';
import {
  WhitelistedCreator,
  AuctionManagerV1,
  AuctionManagerV2,
  getBidRedemption,
  getPrizeTrackingTicket,
} from '../../models/metaplex';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  AccountAndPubkey,
  MetaState,
  ProcessAccountsFunc,
  UpdateStateValueFunc,
  UnPromise,
} from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import { ParsedAccount } from '../accounts/types';
import { getEmptyMetaState } from './getEmptyMetaState';
import { getMultipleAccounts } from '../accounts/getMultipleAccounts';
import { getProgramAccounts } from './web3';
import { createPipelineExecutor } from '../../utils/createPipelineExecutor';
import { programIds } from '../..';

export const loadAccounts = async (
  connection: Connection,
  ownerAddress: StringPublicKey,
): Promise<MetaState> => {
  const state: MetaState = getEmptyMetaState();
  const updateState = makeSetter(state);
  const forEachAccount = processingAccounts(updateState);
  const storeAddress = await getStoreID(ownerAddress);

  if (!storeAddress) {
    console.error("no store address. unable to lookup store account.");
    return state;
  }

  const loadStorefront = async (storeAddress: StringPublicKey) => {
    const storePubkey = new PublicKey(storeAddress);
    const storeData = await connection.getAccountInfo(storePubkey);

    if (storeData) {
      processMetaplexAccounts(
        {
          pubkey: storeAddress,
          account: storeData,
        },
        updateState,
      );
    }
  };

  const loadAuctionManagers = async (
    storeAddress: StringPublicKey,
  ): Promise<ParsedAccount<AuctionManagerV1 | AuctionManagerV2>[]> => {
    const response = await getProgramAccounts(connection, METAPLEX_ID, {
      filters: [
        {
          memcmp: {
            offset:
              1, // key
            bytes: storeAddress,
          },
        },
      ],
    });

    await forEachAccount(processMetaplexAccounts)(response);

    return Object.values(state.auctionManagersByAuction);
  };

  const loadAuctionsFromAuctionManagers = async (
    parsedAccounts: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>[],
  ) => {
    const auctionIds = parsedAccounts.map(({ info: { auction } }) => auction);

    const auctionExtendedKeys = await Promise.all(
      parsedAccounts.map(account =>
        getAuctionExtended({
          auctionProgramId: AUCTION_ID,
          resource: account.info.vault,
        }),
      ),
    );

    const auctionData = await getMultipleAccounts(
      connection,
      [...auctionIds, ...auctionExtendedKeys],
      'single',
    );

    if (auctionData) {
      await Promise.all(
        auctionData.keys.map((pubkey, i) => {
          processAuctions(
            {
              pubkey,
              account: auctionData.array[i],
            },
            updateState,
          );
        }),
      );
    }
  };

  const loadVaultsForAuctionManagers = async (
    parsedAccounts: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>[],
  ) => {
    const vaultKeys = parsedAccounts.map(({ info: { vault } }) => vault);

    const vaultData = await getMultipleAccounts(
      connection,
      vaultKeys,
      'single',
    );

    if (vaultData) {
      await Promise.all(
        vaultData.keys.map((pubkey, i) => {
          processVaultData(
            {
              pubkey,
              account: vaultData.array[i],
            },
            updateState,
          );
        }),
      );
    }
  };

  const loadCreators = () =>
    getProgramAccounts(connection, METAPLEX_ID, {
      filters: [
        {
          dataSize: MAX_WHITELISTED_CREATOR_SIZE,
        },
      ],
    }).then(forEachAccount(processMetaplexAccounts));

  const loadAuctionsAndVaults = async (
    parsedAccounts: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>[],
  ) => {
    await Promise.all([
      loadAuctionsFromAuctionManagers(parsedAccounts),
      loadVaultsForAuctionManagers(parsedAccounts),
    ]);
  };
  const loading = [
    loadCreators(),
    loadStorefront(storeAddress),
    loadAuctionManagers(storeAddress).then(loadAuctionsAndVaults),
  ];

  await Promise.all(loading);

  return state;
};

export const loadPrizeTrackingTickets = async (
  connection: Connection,
  auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>,
  metadata: ParsedAccount<Metadata>[]
): Promise<MetaState> => {
  const state = getEmptyMetaState();
  const updateState = makeSetter(state);

  const prizeTrackingKeys = await Promise.all(
    metadata.map(m => getPrizeTrackingTicket(auctionManager.pubkey, m.info.mint))
  );

  const prizeTrackingTicketsResponse = await getMultipleAccounts(
    connection,
    prizeTrackingKeys,
    'single'
  )

  if (!prizeTrackingTicketsResponse) {
    console.error(`no prize tracking ticket response for auction manager ${auctionManager.pubkey}`)
    return state;
  }

  await Promise.all(
    prizeTrackingTicketsResponse.keys.map((pubkey, i) => {
      const account = prizeTrackingTicketsResponse.array[i]

      if (!account) {
        return
      }

      return processMetaplexAccounts(
        {
          pubkey,
          account,
        },
        updateState,
      );
    }),
  );

  return state;
}

export const loadMetaDataAndEditionsForCreators = async (
  connection: Connection,
  whitelistedCreatorsByCreator: Record<string, ParsedAccount<WhitelistedCreator>>
): Promise<MetaState> => {
  const loadMetadata = () =>
    pullMetadataByCreators(connection, whitelistedCreatorsByCreator);
  const loadEditions = (state: MetaState) => pullEditions(connection, state);

  const state = await loadMetadata().then(loadEditions);

  return state;
}

export const querySafetyDepositBoxByVault = async (
  connection: Connection,
  vaultPublicKey: StringPublicKey,
): Promise<MetaState> => {
  const state: MetaState = getEmptyMetaState();
  const updateState = makeSetter(state);
  const forEachAccount = processingAccounts(updateState);

  const response = await getProgramAccounts(connection, VAULT_ID, {
    filters: [
      {
        memcmp: {
          offset: 1,
          bytes: vaultPublicKey,
        },
      },
    ],
  });

  await forEachAccount(processVaultData)(response);

  return state;
};

const pullEditions = async (
  connection: Connection,
  state: MetaState,
): Promise<MetaState> => {
  const updateState = makeSetter(state);
  console.log('Pulling editions for optimized metadata');

  type MultipleAccounts = UnPromise<ReturnType<typeof getMultipleAccounts>>;
  let setOf100MetadataEditionKeys: string[] = [];
  const editionPromises: Promise<void>[] = [];

  const loadBatch = () => {
    editionPromises.push(
      getMultipleAccounts(
        connection,
        setOf100MetadataEditionKeys,
        'recent',
      ).then(processEditions),
    );
    setOf100MetadataEditionKeys = [];
  };

  const processEditions = (returnedAccounts: MultipleAccounts) => {
    for (let j = 0; j < returnedAccounts.array.length; j++) {
      processMetaData(
        {
          pubkey: returnedAccounts.keys[j],
          account: returnedAccounts.array[j],
        },
        updateState,
      );
    }
  };

  for (const metadata of state.metadata) {
    let editionKey: StringPublicKey;
    if (metadata.info.editionNonce === null) {
      editionKey = await getEdition(metadata.info.mint);
    } else {
      editionKey = (
        await PublicKey.createProgramAddress(
          [
            Buffer.from(METADATA_PREFIX),
            toPublicKey(METADATA_PROGRAM_ID).toBuffer(),
            toPublicKey(metadata.info.mint).toBuffer(),
            new Uint8Array([metadata.info.editionNonce || 0]),
          ],
          toPublicKey(METADATA_PROGRAM_ID),
        )
      ).toBase58();
    }

    setOf100MetadataEditionKeys.push(editionKey);

    if (setOf100MetadataEditionKeys.length >= 100) {
      loadBatch();
    }
  }

  if (setOf100MetadataEditionKeys.length >= 0) {
    loadBatch();
  }

  await Promise.all(editionPromises);

  console.log(
    'Edition size',
    Object.keys(state.editions).length,
    Object.keys(state.masterEditions).length,
  );

  return state;
};

export const loadArtwork = async (
  connection: Connection,
  whitelistedCreatorsByCreator: Record<string, ParsedAccount<WhitelistedCreator>>,
  key: StringPublicKey,
): Promise<MetaState> => {
  const state: MetaState = getEmptyMetaState();
  const updateState = makeSetter(state);
  const metaResponse = await getMultipleAccounts(connection, [key], 'single')

  if (!metaResponse) {
    console.error("No meta response");

    return state;
  }

  const [metadataAccount] = metaResponse.keys.map((pubkey, i) => {
    const account = metaResponse.array[i]

    if (!account) {
      return;
    }

    return {
      pubkey,
      account,
      info: decodeMetadata(account.data),
    } as ParsedAccount<Metadata>
  });

  if (!metadataAccount) {
    return state;
  }

  await initMetadata(metadataAccount, whitelistedCreatorsByCreator, updateState)

  await pullEditions(connection, state);

  return state;
}

export const loadAuction = async (
  connection: Connection,
  auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>,
): Promise<MetaState> => {
  const state: MetaState = getEmptyMetaState();
  const updateState = makeSetter(state);
  const forEachAccount = processingAccounts(updateState);

  const rpcQueries = [
    // safety deposit box config
    getProgramAccounts(connection, METAPLEX_ID, {
      filters: [
        {
          memcmp: {
            offset: 1,
            bytes: auctionManager.pubkey,
          },
        },
      ],
    }).then(forEachAccount(processMetaplexAccounts)),
    // safety deposit
    getProgramAccounts(connection, VAULT_ID, {
      filters: [
        {
          memcmp: {
            offset: 1,
            bytes: auctionManager.info.vault,
          },
        },
      ],
    }).then(forEachAccount(processVaultData)),
    // bidder redemptions
    getProgramAccounts(connection, METAPLEX_ID, {
      filters: [
        {
          memcmp: {
            offset: 9,
            bytes: auctionManager.pubkey,
          },
        },
      ],
    }).then(forEachAccount(processMetaplexAccounts)),
    // bidder metadata
    getProgramAccounts(connection, AUCTION_ID, {
      filters: [
        {
          memcmp: {
            offset: 32,
            bytes: auctionManager.info.auction,
          },
        },
      ],
    }).then(forEachAccount(processAuctions)),
    // bidder pot
    getProgramAccounts(connection, AUCTION_ID, {
      filters: [
        {
          memcmp: {
            offset: 64,
            bytes: auctionManager.info.auction,
          },
        },
      ],
    }).then(forEachAccount(processAuctions)),
  ]

  await Promise.all(rpcQueries);

  const bidderRedemptionIds = await Promise.all(
    Object
      .values(state.bidderMetadataByAuctionAndBidder)
      .map(bm => getBidRedemption(auctionManager.info.auction, bm.pubkey))
  )

  const bidRedemptionData = await getMultipleAccounts(
    connection,
    bidderRedemptionIds,
    'single',
  );

  if (bidRedemptionData) {
    await Promise.all(
      bidRedemptionData.keys.map((pubkey, i) => {
        const account = bidRedemptionData.array[i]

        if (!account) {
          return
        }

        return processMetaplexAccounts(
          {
            pubkey,
            account,
          },
          updateState,
        );
      }),
    );
  }

  return state;
};

export const loadMetadataAndEditionsBySafetyDepositBoxes = async (
  connection: Connection,
  safetyDepositBoxesByVaultAndIndex: Record<string, ParsedAccount<SafetyDepositBox>>,
  whitelistedCreatorsByCreator: Record<string, ParsedAccount<WhitelistedCreator>>
): Promise<MetaState> => {
  const nextState: MetaState = getEmptyMetaState();
  const updateState = makeSetter(nextState);

  const metadataKeys = await Promise.all(
    Object
      .values(safetyDepositBoxesByVaultAndIndex)
      .map(({ info: { tokenMint } }) => getMetadata(tokenMint))
  )

  const metadataData = await getMultipleAccounts(
    connection,
    metadataKeys,
    'single',
  );

  if (!metadataData) {
    console.error("No response from metadata query by mint");

    return nextState;
  }

  const metadata = metadataData.keys
  .filter(k => !!metadataData[k])
  .map((pubkey, i) => {
    const account = metadataData.array[i];

    return {
      pubkey,
      account,
      info: decodeMetadata(account.data),
    } as ParsedAccount<Metadata>
  });

  const readyMetadata = metadata.map(m => initMetadata(m, whitelistedCreatorsByCreator, updateState))

  await Promise.all(readyMetadata)

  await pullEditions(connection, nextState);

  return nextState;
}

export const loadMetadataForCreator = async (
  connection: Connection,
  creator: ParsedAccount<WhitelistedCreator>
): Promise<MetaState> => {
  const state: MetaState = getEmptyMetaState();
  const updateState = makeSetter(state);

  const setter: UpdateStateValueFunc = async (prop, key, value) => {
    if (prop === 'metadataByMint') {
      await initMetadata(value, { [creator.info.address]: creator }, updateState);
    } else {
      updateState(prop, key, value);
    }
  };
  const forEachAccount = processingAccounts(setter);

  const promises: Promise<void>[] = [];

  for (let i = 0; i < MAX_CREATOR_LIMIT; i++) {
    const promise = getProgramAccounts(connection, METADATA_PROGRAM_ID, {
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
            bytes: creator.info.address,
          },
        },
      ],
    }).then(forEachAccount(processMetaData));

    promises.push(promise);
  }

  await Promise.all(promises)

  return state;
}

const pullMetadataByCreators = async (
  connection: Connection,
  whitelistedCreatorsByCreator: Record<string, ParsedAccount<WhitelistedCreator>>,
): Promise<MetaState> => {
  console.log('pulling optimized nfts');

  const whitelistedCreators = Object.values(whitelistedCreatorsByCreator);

  const additionalPromises: Promise<MetaState>[] = [];
  for (const creator of whitelistedCreators) {
    additionalPromises.push(loadMetadataForCreator(connection, creator))
  }

  const responses = await Promise.all(additionalPromises);

  return responses.reduce((memo, state) => {
    const next = merge({}, memo, state);
    const currentMetadata = memo.metadata ?? [];
    const metadata = state.metadata ?? [];
    next.metadata = uniqWith([...currentMetadata, ...metadata], (a, b) => a.pubkey === b.pubkey)

    return next;
  }, getEmptyMetaState());
};

export const makeSetter =
  (state: MetaState): UpdateStateValueFunc<MetaState> =>
    (prop, key, value) => {
      if (prop === 'store') {
        state[prop] = value;
      } else if (prop === 'metadata') {
        state.metadata.push(value);
      } else {
        state[prop][key] = value;
      }
      return state;
    };

export const processingAccounts =
  (updater: UpdateStateValueFunc) =>
    (fn: ProcessAccountsFunc) =>
      async (accounts: AccountAndPubkey[]) => {
        await createPipelineExecutor(
          accounts.values(),
          account => fn(account, updater),
          {
            sequence: 10,
            delay: 1,
            jobsCount: 3,
          },
        );
      };

export const metadataByMintUpdater = async (
  metadata: ParsedAccount<Metadata>,
  state: MetaState,
) => {
  const key = metadata.info.mint;
  if (isMetadataPartOfStore(metadata, state.whitelistedCreatorsByCreator)) {
    await metadata.info.init();
    const masterEditionKey = metadata.info?.masterEdition;
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

export const initMetadata = async (
  metadata: ParsedAccount<Metadata>,
  whitelistedCreators: Record<string, ParsedAccount<WhitelistedCreator>>,
  setter: UpdateStateValueFunc,
) => {
  if (isMetadataPartOfStore(metadata, whitelistedCreators)) {
    await metadata.info.init();
    setter('metadataByMint', metadata.info.mint, metadata);
    setter('metadata', '', metadata);
    const masterEditionKey = metadata.info?.masterEdition;
    if (masterEditionKey) {
      setter('metadataByMasterEdition', masterEditionKey, metadata);
    }
  }
};

export const loadMultipleAccounts = async (
  conn: Connection,
  keys: StringPublicKey[],
  commitment: string,
): Promise<MetaState> => {
  const tempCache: MetaState = getEmptyMetaState();
  const updateTemp = makeSetter(tempCache);
  const { array } = await getMultipleAccounts(conn, keys, commitment);

  await Promise.all(
    array.map(async (account, i) => {
      const pubkey = keys[i];

      // account has an incorrect type ascription
      if (!account) {
        console.warn(`Didn't see account for pubkey ${pubkey}`);

        return;
      }

      const PROGRAM_IDS = programIds();
      const pair = { pubkey, account };

      // account.owner ALSO has an incorrect type ascription
      const owner =
        account.owner instanceof PublicKey
          ? account.owner.toBase58()
          : (account.owner as string);

      switch (owner) {
        case PROGRAM_IDS.metadata:
          await processMetaData(pair, updateTemp);
          break;
        case PROGRAM_IDS.vault:
          await processVaultData(pair, updateTemp);
          break;
        case PROGRAM_IDS.auction:
          await processAuctions(pair, updateTemp);
          break;
        case PROGRAM_IDS.metaplex:
          await processMetaplexAccounts(pair, updateTemp);
          break;
        default:
          // console.warn(
          //   `Not sure what to do with account ${pubkey} owned by ${account.owner}`,
          // );
          break;
      }
    }),
  );

  return tempCache;
};
