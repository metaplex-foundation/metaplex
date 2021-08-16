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
} from '../../actions';
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js';
import { AccountAndPubkey, MetaState, ProcessAccountsFunc } from './types';
import { isMetadataPartOfStore } from './isMetadataPartOfStore';
import { processAuctions } from './processAuctions';
import { processMetaplexAccounts } from './processMetaplexAccounts';
import { processMetaData } from './processMetaData';
import { processVaultData } from './processVaultData';
import { ParsedAccount } from '../accounts/types';
import { getEmptyMetaState } from './getEmptyMetaState';
import { getMultipleAccounts } from '../accounts/getMultipleAccounts';

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

export const loadAccounts = async (connection: Connection, all: boolean) => {
  const tempCache: MetaState = getEmptyMetaState();
  const updateTemp = makeSetter(tempCache);

  const forEach =
    (fn: ProcessAccountsFunc) => async (accounts: AccountAndPubkey[]) => {
      for (const account of accounts) {
        await fn(account, updateTemp, all);
      }
    };

  let isSelectivePullMetadata = false;
  const pullMetadata = async (creators: AccountAndPubkey[]) => {
    await forEach(processMetaplexAccounts)(creators);

    const whitelistedCreators = Object.values(
      tempCache.whitelistedCreatorsByCreator,
    );

    if (whitelistedCreators.length > 3) {
      console.log(' too many creators, pulling all nfts in one go');
      additionalPromises.push(
        getProgramAccounts(connection, METADATA_PROGRAM_ID).then(
          forEach(processMetaData),
        ),
      );
    } else {
      console.log('pulling optimized nfts');
      isSelectivePullMetadata = true;

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
    }
  };

  const pullEditions = async () => {
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
          getMultipleAccounts(
            connection,
            setOf100MetadataEditionKeys,
            'recent',
          ),
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

  const IS_BIG_STORE =
    all || process.env.NEXT_PUBLIC_BIG_STORE?.toLowerCase() === 'true';
  console.log(`Is big store: ${IS_BIG_STORE}`);

  const additionalPromises: Promise<void>[] = [];
  const basePromises = [
    getProgramAccounts(connection, VAULT_ID).then(forEach(processVaultData)),
    getProgramAccounts(connection, AUCTION_ID).then(forEach(processAuctions)),
    getProgramAccounts(connection, METAPLEX_ID).then(
      forEach(processMetaplexAccounts),
    ),
    IS_BIG_STORE
      ? getProgramAccounts(connection, METADATA_PROGRAM_ID).then(
          forEach(processMetaData),
        )
      : getProgramAccounts(connection, METAPLEX_ID, {
          filters: [
            {
              dataSize: MAX_WHITELISTED_CREATOR_SIZE,
            },
          ],
        }).then(pullMetadata),
  ];
  await Promise.all(basePromises);
  await Promise.all(additionalPromises);

  await postProcessMetadata(tempCache, all);
  console.log('Metadata size', tempCache.metadata.length);

  if (isSelectivePullMetadata) {
    await pullEditions();
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
