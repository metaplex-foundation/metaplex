import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  StringPublicKey,
  toPublicKey,
  VAULT_ID,
} from '../../utils/ids';
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
  decodeAuction,
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

export const USE_SPEED_RUN = true;
const WHITELISTED_METADATA = ['98vYFjBYS9TguUMWQRPjy2SZuxKuUMcqR4vnQiLjZbte'];
const WHITELISTED_AUCTION = ['D8wMB5iLZnsV7XQjpwqXaDynUtFuDs7cRXvEGNj1NF1e'];
const AUCTION_TO_METADATA: Record<string, string[]> = {
  D8wMB5iLZnsV7XQjpwqXaDynUtFuDs7cRXvEGNj1NF1e: [
    '98vYFjBYS9TguUMWQRPjy2SZuxKuUMcqR4vnQiLjZbte',
  ],
};
const AUCTION_TO_VAULT: Record<string, string> = {
  D8wMB5iLZnsV7XQjpwqXaDynUtFuDs7cRXvEGNj1NF1e:
    '3wHCBd3fYRPWjd5GqzrXanLJUKRyU3nECKbTPKfVwcFX',
};
const WHITELISTED_AUCTION_MANAGER = [
  '3HD2C8oCL8dpqbXo8hq3CMw6tRSZDZJGajLxnrZ3ZkYx',
];
const WHITELISTED_VAULT = ['3wHCBd3fYRPWjd5GqzrXanLJUKRyU3nECKbTPKfVwcFX'];

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

export const limitedLoadAccounts = async (connection: Connection) => {
  const tempCache: MetaState = getEmptyMetaState();
  const updateTemp = makeSetter(tempCache);

  const forEach =
    (fn: ProcessAccountsFunc) => async (accounts: AccountAndPubkey[]) => {
      for (const account of accounts) {
        await fn(account, updateTemp, false);
      }
    };

  const pullMetadata = async (metadata: string) => {
    const mdKey = new PublicKey(metadata);
    const md = await connection.getAccountInfo(mdKey);
    const mdObject = decodeMetadata(
      Buffer.from(md?.data || new Uint8Array([])),
    );
    const editionKey = await getEdition(mdObject.mint);
    const editionData = await connection.getAccountInfo(
      new PublicKey(editionKey),
    );
    if (md) {
      //@ts-ignore
      md.owner = md.owner.toBase58();
      processMetaData(
        {
          pubkey: metadata,
          account: md,
        },
        updateTemp,
        false,
      );
      if (editionData) {
        //@ts-ignore
        editionData.owner = editionData.owner.toBase58();
        processMetaData(
          {
            pubkey: editionKey,
            account: editionData,
          },
          updateTemp,
          false,
        );
      }
    }
  };

  const pullAuction = async (auction: string) => {
    const auctionExtendedKey = await getAuctionExtended({
      auctionProgramId: AUCTION_ID,
      resource: AUCTION_TO_VAULT[auction],
    });

    const auctionData = await getMultipleAccounts(
      connection,
      [auction, auctionExtendedKey],
      'single',
    );

    if (auctionData) {
      auctionData.keys.map((pubkey, i) => {
        processAuctions(
          {
            pubkey,
            account: auctionData.array[i],
          },
          updateTemp,
          false,
        );
      });
    }
  };

  const pullAuctionManager = async (auctionManager: string) => {
    const auctionManagerKey = new PublicKey(auctionManager);
    const auctionManagerData = await connection.getAccountInfo(
      auctionManagerKey,
    );
    if (auctionManagerData) {
      //@ts-ignore
      auctionManagerData.owner = auctionManagerData.owner.toBase58();
      processMetaplexAccounts(
        {
          pubkey: auctionManager,
          account: auctionManagerData,
        },
        updateTemp,
        false,
      );
    }
  };

  const pullVault = async (vault: string) => {
    const vaultKey = new PublicKey(vault);
    const vaultData = await connection.getAccountInfo(vaultKey);
    if (vaultData) {
      //@ts-ignore
      vaultData.owner = vaultData.owner.toBase58();
      processVaultData(
        {
          pubkey: vault,
          account: vaultData,
        },
        updateTemp,
        false,
      );
    }
  };

  const promises = [
    ...WHITELISTED_METADATA.map(md => pullMetadata(md)),
    ...WHITELISTED_AUCTION.map(a => pullAuction(a)),
    ...WHITELISTED_AUCTION_MANAGER.map(a => pullAuctionManager(a)),
    ...WHITELISTED_VAULT.map(a => pullVault(a)),
    // bidder metadata pull
    ...WHITELISTED_AUCTION.map(a =>
      getProgramAccounts(connection, AUCTION_ID, {
        filters: [
          {
            memcmp: {
              offset: 32,
              bytes: a,
            },
          },
        ],
      }).then(forEach(processAuctions)),
    ),
    // bidder pot pull
    ...WHITELISTED_AUCTION.map(a =>
      getProgramAccounts(connection, AUCTION_ID, {
        filters: [
          {
            memcmp: {
              offset: 64,
              bytes: a,
            },
          },
        ],
      }).then(forEach(processAuctions)),
    ),
    // safety deposit pull
    ...WHITELISTED_VAULT.map(v =>
      getProgramAccounts(connection, VAULT_ID, {
        filters: [
          {
            memcmp: {
              offset: 1,
              bytes: v,
            },
          },
        ],
      }).then(forEach(processVaultData)),
    ),
    // bid redemptions
    ...WHITELISTED_AUCTION_MANAGER.map(a =>
      getProgramAccounts(connection, METAPLEX_ID, {
        filters: [
          {
            memcmp: {
              offset: 9,
              bytes: a,
            },
          },
        ],
      }).then(forEach(processMetaplexAccounts)),
    ),
    // safety deposit configs
    ...WHITELISTED_AUCTION_MANAGER.map(a =>
      getProgramAccounts(connection, METAPLEX_ID, {
        filters: [
          {
            memcmp: {
              offset: 1,
              bytes: a,
            },
          },
        ],
      }).then(forEach(processMetaplexAccounts)),
    ),
    // prize tracking tickets
    ...Object.keys(AUCTION_TO_METADATA)
      .map(key =>
        AUCTION_TO_METADATA[key]
          .map(md =>
            getProgramAccounts(connection, METAPLEX_ID, {
              filters: [
                {
                  memcmp: {
                    offset: 1,
                    bytes: md,
                  },
                },
              ],
            }).then(forEach(processMetaplexAccounts)),
          )
          .flat(),
      )
      .flat(),
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
