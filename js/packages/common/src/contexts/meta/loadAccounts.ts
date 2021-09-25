import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  StringPublicKey,
  toPublicKey,
  VAULT_ID,
} from '../../utils/ids';
import {
  MAX_WHITELISTED_CREATOR_SIZE,
  AuctionManagerV2,
  AuctionManagerV1,
} from '../../models';
import {
  getEdition,
  Metadata,
  MAX_CREATOR_LEN,
  MAX_CREATOR_LIMIT,
  MAX_NAME_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_URI_LENGTH,
  METADATA_PREFIX,
  getAuctionExtended,
} from '../../actions';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import {
  AccountAndPubkey,
  MetaState,
  ProcessAccountsFunc,
  UpdateStateValueFunc,
} from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import { ParsedAccount } from '../accounts/types';
import { getEmptyMetaState } from './getEmptyMetaState';
import { getMultipleAccounts } from '../accounts/getMultipleAccounts';

type StateUpdaterFunc = (state: keyof MetaState, key: string, value: ParsedAccount<any>) => MetaState


async function getProgramAccounts(
  connection: Connection,
  programId: StringPublicKey,
  configOrCommitment?: any,
): Promise<Array<AccountAndPubkey>> {
  const extra: any = {};
  let commitment;
  //let encoding;

  if (configOrCommitment) {
    if (typeof configOrCommitment === 'string') {
      commitment = configOrCommitment;
    } else {
      commitment = configOrCommitment.commitment;
      //encoding = configOrCommitment.encoding;

      if (configOrCommitment.dataSlice) {
        extra.dataSlice = configOrCommitment.dataSlice;
      }

      if (configOrCommitment.filters) {
        extra.filters = configOrCommitment.filters;
      }
    }
  }

  const args = connection._buildArgs([programId], commitment, 'base64', extra);
  const unsafeRes = await (connection as any)._rpcRequest(
    'getProgramAccounts',
    args,
  );

  if (unsafeRes.error) {
    throw new Error(unsafeRes.error.message);
  }

  const data = (
    unsafeRes.result as Array<{
      account: AccountInfo<[string, string]>;
      pubkey: string;
    }>
  ).map(item => {
    return {
      account: {
        // TODO: possible delay parsing could be added here
        data: Buffer.from(item.account.data[0], 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        // TODO: maybe we can do it in lazy way? or just use string
        owner: item.account.owner,
      } as AccountInfo<Buffer>,
      pubkey: item.pubkey,
    };
  });

  return data;
}

export const limitedLoadAccounts = async (
  ownerAddress: StringPublicKey,
  storeAddress: string,
  connection: Connection,
) => {
  const tempCache: MetaState = getEmptyMetaState();
  const updateTemp = makeSetter(tempCache);

  const forEach = forEachUsingUpdater(updateTemp);

  const getMetaDataByStoreOwner = async (
    ownerAddress: StringPublicKey,
  ): Promise<void> => {
    const response = await getProgramAccounts(connection, METADATA_PROGRAM_ID, {
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
              4, // creators vec length
            bytes: ownerAddress,
          },
        },
      ],
    })

    await forEach(processMetaData)(response);
  };

  const getStoreAuctionManagers = async (ownerAddress: StringPublicKey) => {
    const response = await getProgramAccounts(connection, METAPLEX_ID, {
      filters: [
        {
          memcmp: {
            offset:
              1 + // key
              32, // store
            bytes: ownerAddress,
          },
        },
      ],
    });

    await forEach(processMetaplexAccounts)(response);
  };

  const getEditionsFromMetadata = async (mintIds: string[]) => {
    const editionKeys = await Promise.all(mintIds.map(getEdition));

    const editionData = await getMultipleAccounts(
      connection,
      editionKeys,
      'single',
    );

    if (editionData) {
      await Promise.all(
        editionData.keys.map((pubkey, i) => {
          processMetaData(
            {
              pubkey,
              account: editionData.array[i],
            },
            updateTemp,
            false,
          );
        }),
      );
    }
  };

  const getAuctionsFromAuctionManagers = async (
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
            updateTemp,
            false,
          );
        }),
      );
    }
  };

  const getVaultsForAuctionManagers = async (
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
            updateTemp,
            false,
          );
        }),
      );
    }
  };

  const getStore = async (storeAddress: string) => {
    const storePubkey = new PublicKey(storeAddress);
    const storeData = await connection.getAccountInfo(storePubkey);

    if (storeData) {
      //@ts-ignore
      storeData.owner = storeData.owner.toBase58();
      processMetaplexAccounts(
        {
          pubkey: storeAddress,
          account: storeData,
        },
        updateTemp,
        false,
      );
    }
  };

  await Promise.all([
    getStoreAuctionManagers(ownerAddress),
    getStore(storeAddress),
    getMetaDataByStoreOwner(ownerAddress),
  ]);

  const parsedAuctionManagers = Object.values(
    tempCache.auctionManagersByAuction,
  );

  const mintIds = Object.keys(tempCache.metadataByMint);

  const promises = [
    getAuctionsFromAuctionManagers(parsedAuctionManagers),
    getVaultsForAuctionManagers(parsedAuctionManagers),
    getEditionsFromMetadata(mintIds),
    // // prize tracking tickets
    // ...Object.keys(AUCTION_TO_METADATA)
    //   .map(key =>
    //     AUCTION_TO_METADATA[key]
    //       .map(md =>
    //         getProgramAccounts(connection, METAPLEX_ID, {
    //           filters: [
    //             {
    //               memcmp: {
    //                 offset: 1,
    //                 bytes: md,
    //               },
    //             },
    //           ],
    //         }).then(forEach(processMetaplexAccounts)),
    //       )
    //       .flat(),
    //   )
    //   .flat(),
    // whitelisted creators
    getProgramAccounts(connection, METAPLEX_ID, {
      filters: [
        {
          dataSize: MAX_WHITELISTED_CREATOR_SIZE,
        },
      ],
    }).then(forEach(processMetaplexAccounts)),
  ];

  await Promise.all(promises);

  await postProcessMetadata(tempCache, true);

  return tempCache;
};

const forEachUsingUpdater =
  (updateTemp: StateUpdaterFunc) => (fn: ProcessAccountsFunc) => async (accounts: AccountAndPubkey[]) => {
    for (const account of accounts) {
      await fn(account, updateTemp, false);
    }
  };

export const loadAuction = async (
  connection: Connection,
  auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>,
  complete: boolean = false,
): Promise<MetaState> => {
  const tempCache: MetaState = getEmptyMetaState();
  const updateTemp = makeSetter(tempCache);

  const forEach = forEachUsingUpdater(updateTemp)

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
    }).then(forEach(processMetaplexAccounts)),
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
    }).then(forEach(processVaultData)),
  ]

  if (complete) {
    rpcQueries.push(
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
      }).then(forEach(processMetaplexAccounts)),
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
      }).then(forEach(processAuctions)),
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
      }).then(forEach(processAuctions)),
    )
  }

  await Promise.all(rpcQueries);

  return tempCache;
};

export const loadBidPotForAuctionManager = (connection: Connection, auctionManager: ParsedAccount<AuctionManagerV1 | AuctionManagerV2>) => {

}

export const loadAccounts = async (connection: Connection, all: boolean) => {
  const tempCache: MetaState = getEmptyMetaState();
  const updateTemp = makeSetter(tempCache);

  const forEach =
    (fn: ProcessAccountsFunc) => async (accounts: AccountAndPubkey[]) => {
      for (const account of accounts) {
        await fn(account, updateTemp, all);
      }
    };

  const pullMetadata = async (creators: AccountAndPubkey[]) => {
    await forEach(processMetaplexAccounts)(creators);
  };

  const basePromises = [
    getProgramAccounts(connection, VAULT_ID).then(forEach(processVaultData)),
    getProgramAccounts(connection, AUCTION_ID).then(forEach(processAuctions)),
    getProgramAccounts(connection, METAPLEX_ID).then(
      forEach(processMetaplexAccounts),
    ),
    getProgramAccounts(connection, METAPLEX_ID, {
      filters: [
        {
          dataSize: MAX_WHITELISTED_CREATOR_SIZE,
        },
      ],
    }).then(pullMetadata),
  ];
  await Promise.all(basePromises);
  const additionalPromises: Promise<void>[] = getAdditionalPromises(
    connection,
    tempCache,
    forEach,
  );

  await Promise.all(additionalPromises);

  await postProcessMetadata(tempCache, all);
  console.log('Metadata size', tempCache.metadata.length);

  await pullEditions(connection, updateTemp, tempCache, all);

  return tempCache;
};

const pullEditions = async (
  connection: Connection,
  updateTemp: UpdateStateValueFunc,
  tempCache: MetaState,
  all: boolean,
) => {
  console.log('Pulling editions for optimized metadata');
  let setOf100MetadataEditionKeys: string[] = [];
  const editionPromises: Promise<{
    keys: string[];
    array: AccountInfo<Buffer>[];
  }>[] = [];

  for (let i = 0; i < tempCache.metadata.length; i++) {
    let edition: StringPublicKey;
    if (tempCache.metadata[i].info.editionNonce != null) {
      edition = (
        await PublicKey.createProgramAddress(
          [
            Buffer.from(METADATA_PREFIX),
            toPublicKey(METADATA_PROGRAM_ID).toBuffer(),
            toPublicKey(tempCache.metadata[i].info.mint).toBuffer(),
            new Uint8Array([tempCache.metadata[i].info.editionNonce || 0]),
          ],
          toPublicKey(METADATA_PROGRAM_ID),
        )
      ).toBase58();
    } else {
      edition = await getEdition(tempCache.metadata[i].info.mint);
    }

    setOf100MetadataEditionKeys.push(edition);

    if (setOf100MetadataEditionKeys.length >= 100) {
      editionPromises.push(
        getMultipleAccounts(connection, setOf100MetadataEditionKeys, 'recent'),
      );
      setOf100MetadataEditionKeys = [];
    }
  }

  if (setOf100MetadataEditionKeys.length >= 0) {
    editionPromises.push(
      getMultipleAccounts(connection, setOf100MetadataEditionKeys, 'recent'),
    );
    setOf100MetadataEditionKeys = [];
  }

  const responses = await Promise.all(editionPromises);
  for (let i = 0; i < responses.length; i++) {
    const returnedAccounts = responses[i];
    for (let j = 0; j < returnedAccounts.array.length; j++) {
      processMetaData(
        {
          pubkey: returnedAccounts.keys[j],
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
};
const getAdditionalPromises = (
  connection: Connection,
  tempCache: MetaState,
  forEach: any,
): Promise<void>[] => {
  console.log('pulling optimized nfts');
  const whitelistedCreators = Object.values(
    tempCache.whitelistedCreatorsByCreator,
  );
  const additionalPromises: Promise<void>[] = [];
  for (let i = 0; i < MAX_CREATOR_LIMIT; i++) {
    for (let j = 0; j < whitelistedCreators.length; j++) {
      additionalPromises.push(
        getProgramAccounts(connection, METADATA_PROGRAM_ID, {
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
                bytes: whitelistedCreators[j].info.address,
              },
            },
          ],
        }).then(forEach(processMetaData)),
      );
    }
  }

  return additionalPromises;
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
  const key = metadata.info.mint;
  if (
    all ||
    isMetadataPartOfStore(
      metadata,
      state.store,
      state.whitelistedCreatorsByCreator,
    )
  ) {
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
