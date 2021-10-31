import { AccountInfo, Connection, PublicKey} from "@solana/web3.js";
import { MongoClient } from "mongodb";
import {
  CREATORS_COLLECTION,
  DB,
  EDITIONS_COLLECTION,
  MASTER_EDITIONS_V1_COLLECTION,
  MASTER_EDITIONS_V2_COLLECTION,
  METADATA_COLLECTION,
} from "../../db/mongo-utils";
import { accountConverterSet, StoreAccountDocument } from "../accounts/account";
import {
  MAX_NAME_LENGTH,
  MAX_URI_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_CREATOR_LEN,
  MAX_CREATOR_LIMIT,
} from "../accounts/constants";
import { METADATA_PROGRAM_ID, StringPublicKey, toPublicKey } from "../ids";
import { getProgramAccounts } from "../rpc";
import { AccountAndPubkey } from "../types";
import { keys, uniqWith } from "lodash";
import {
  decodeEdition,
  decodeMasterEdition,
  decodeMetadata,
  Edition,
  EDITION,
  IMetadataExtension,
  MasterEditionV1,
  MasterEditionV1AccountDocument,
  MasterEditionV2,
  MetadataAccountDocument,
  MetadataKey,
  METADATA_PREFIX,
} from "../accounts/metadata";

import axios from "axios";
import { findProgramAddressBase58 } from "../utils";
import { getMultipleAccounts } from "../rpc";
import { decodeWhitelistedCreator } from "../accounts/creator";
const fetchFile = async (uri: string) => {
  try {
    const rawResponse = await axios.get<IMetadataExtension>(uri);

    return rawResponse.data;
  } catch (ex) {
    return undefined;
  }
};

async function getEdition(
  tokenMint: StringPublicKey
): Promise<StringPublicKey> {
  return (
    await findProgramAddressBase58(
      [
        Buffer.from(METADATA_PREFIX),
        toPublicKey(METADATA_PROGRAM_ID).toBuffer(),
        toPublicKey(tokenMint).toBuffer(),
        Buffer.from(EDITION),
      ],
      toPublicKey(METADATA_PROGRAM_ID)
    )
  )[0];
}

const isEditionV1Account = (account: AccountInfo<Buffer>) =>
  account.data[0] === MetadataKey.EditionV1;

const isMasterEditionAccount = (account: AccountInfo<Buffer>) =>
  account.data[0] === MetadataKey.MasterEditionV1 ||
  account.data[0] === MetadataKey.MasterEditionV2;

const isMasterEditionV1 = (
  me: MasterEditionV1 | MasterEditionV2,
): me is MasterEditionV1 => {
  return me.key === MetadataKey.MasterEditionV1;
};


export const loadMetadata = async (
  store: string,
  connection: Connection,
  client: MongoClient
) => {
  console.log('Loading metadata and editions...');
  const collection = client.db(DB).collection(CREATORS_COLLECTION);
  const creators = await collection
    .find<StoreAccountDocument>({ store: store })
    .toArray();

  let metadata: AccountAndPubkey[] = [];

  for (const dbCreator of creators) {
    const dbAccountData = dbCreator.account;
    accountConverterSet.revertConversion(dbCreator);
    const creator = decodeWhitelistedCreator(dbAccountData.data);
    let creatorAccounts: AccountAndPubkey[] = [];

    for (let i = 0; i < MAX_CREATOR_LIMIT; i++) {
      const accounts = await getProgramAccounts(
        connection,
        METADATA_PROGRAM_ID,
        [
          {
            memcmp: {
              offset: 0,
              bytes: "5",
            },
          },
          {
            memcmp: {
              offset:
                32 + // update auth
                1 + // key
                4 + // name string length
                32 + // mint
                4 + // uri string length
                MAX_NAME_LENGTH + // name
                4 + // symbol string length
                MAX_URI_LENGTH + // uri
                2 + // seller fee basis points
                MAX_SYMBOL_LENGTH + // symbol
                4 + // creators vec length
                1 + // whether or not there is a creators vec
                i * MAX_CREATOR_LEN,

              bytes: creator.address,
            },
          },
        ]
      );

      creatorAccounts = creatorAccounts.concat(accounts);
    }

    metadata = metadata.concat(creatorAccounts);
  }

  metadata = uniqWith(
    metadata,
    (a: AccountAndPubkey, b: AccountAndPubkey) => a.pubkey === b.pubkey
  );

  const parsedMetadata = metadata.map((m) => decodeMetadata(m.account.data));
  await Promise.all(parsedMetadata.map((m) => m.init()));
  const fileDownloads = parsedMetadata.map((m) => fetchFile(m.data.uri));
  const results: (IMetadataExtension | undefined)[] = await Promise.all(
    fileDownloads
  );
  const fullData = metadata.map((m, i) => ({
    raw: m,
    parsed: parsedMetadata[i],
    ext: results[i],
  }));

  const metadataDocuments = fullData.map(
    (m) =>
      new MetadataAccountDocument(
        store,
        m.raw.account,
        m.raw.pubkey,
        m.parsed.mint,
        m.ext?.collection?.name,
        m.parsed.data.creators ?? [],
        m.parsed.masterEdition,
        m.parsed.updateAuthority,
        m.ext?.name!,
        m.ext?.description!,
        m.ext?.image!
      )
  );

  accountConverterSet.applyConversion(metadataDocuments);
  const coll = client.db(DB).collection(METADATA_COLLECTION);

  await coll.deleteMany({store : store});
  await coll.createIndex({ store: 1 });
  await coll.createIndex({ mint: 1 });
  await coll.createIndex({ collection: 1 });
  await coll.createIndex({ "creators.address" : 1 });
  await coll.createIndex({ "creators.verified" : 1 });
  await coll.createIndex({ pubkey: 1 });
  await coll.createIndex({ masterEdition: 1 });
  await coll.createIndex({ updateAuthority  :1 });

  if(metadataDocuments.length > 0) {
    try {
      await coll.insertMany(metadataDocuments);
    }
    catch(err) {
      console.log(err);
    }
    finally {
      const docs = await coll.find({}).toArray();
    }
  }

  const editionKeys : StringPublicKey[] = parsedMetadata.map(m => m.edition!);
  const editionAccounts = (await getMultipleAccounts(connection, editionKeys, 'recent'));
  const regularEditions : StoreAccountDocument[] = [];
  const masterEditionsV1 : MasterEditionV1AccountDocument[] = [];
  const masterEditionsV2 : StoreAccountDocument[] = [];

  editionAccounts.keys.forEach((key : string, i : number) => {
    const edition = editionAccounts.array[i];
    if (!edition) return;
    // console.log(edition);
    if(isEditionV1Account(edition)){
      const storeDocument = new StoreAccountDocument(store, key, edition);
      regularEditions.push(storeDocument);
    }
    else if(isMasterEditionAccount(edition)) {
      const masterEdition = decodeMasterEdition(edition.data);
      if(isMasterEditionV1(masterEdition)){
        const doc = new MasterEditionV1AccountDocument(
          store,
          edition,
          key,
          masterEdition.printingMint,
          masterEdition.oneTimePrintingAuthorizationMint
        )
        masterEditionsV1.push(doc);
      }
      else {
        const storeDocument = new StoreAccountDocument(store, key, edition);
        masterEditionsV2.push(storeDocument);
      }
    }
  })

  const editionColl = client.db(DB).collection(EDITIONS_COLLECTION);
  const masterEditionV1Coll = client.db(DB).collection(MASTER_EDITIONS_V1_COLLECTION);
  const masterEditionV2Coll = client.db(DB).collection(MASTER_EDITIONS_V2_COLLECTION);

  await editionColl.deleteMany({store:store});
  await editionColl.createIndex({store: 1, pubkey :1 });

  if(regularEditions.length > 0) {
    accountConverterSet.applyConversion(regularEditions);
    await editionColl.insertMany(regularEditions);
  }

  await masterEditionV1Coll.deleteMany({store : store});
  await masterEditionV1Coll.createIndex({store:1, pubkey:1, printingMint: 1, oneTimePrintingAuthorizationMint : 1});

  if(masterEditionsV1.length > 0) {
    accountConverterSet.applyConversion(masterEditionsV1);
    await masterEditionV1Coll.insertMany(masterEditionsV1);
  }

  await masterEditionV2Coll.deleteMany({store:store});
  await masterEditionV2Coll.createIndex({store: 1, pubkey :1 });

  if(masterEditionsV2.length >0) {
    accountConverterSet.applyConversion(masterEditionsV2);
    await masterEditionV2Coll.insertMany(masterEditionsV2);
  }

  console.log('Metadata and editions loaded');
};
