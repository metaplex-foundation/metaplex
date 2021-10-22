import { Connection } from "@solana/web3.js";
import { MongoClient } from "mongodb";
import { CREATORS_COLLECTION, DB, METADATA_COLLECTION } from "../../db/mongo-utils";
import { accountConverterSet, StoreAccountDocument } from "../accounts/account";
import {
  MAX_NAME_LENGTH,
  MAX_URI_LENGTH,
  MAX_SYMBOL_LENGTH,
  MAX_CREATOR_LEN,
  MAX_CREATOR_LIMIT,
} from "../accounts/constants";
import { decodeWhitelistedCreator } from "../accounts/creator/schema";
import { METADATA_PROGRAM_ID } from "../ids";
import { getProgramAccounts } from "../loadMetaplexAccounts";
import { AccountAndPubkey } from "../types";
import { uniqWith } from "lodash";
import {
  decodeMetadata,
  IMetadataExtension,
  MetadataAccountDocument,
} from "../accounts/metadata/metadata";

import axios from "axios";

const fetchFile = async (uri: string) => {
  try {
    if(!uri) {
      console.log('KLIIIR');
    }

    const rawResponse = await axios.get<IMetadataExtension>(uri);

    return rawResponse.data;
  } catch (ex) {
    return undefined;
  }
};

export const loadMetadata = async (
  store: string,
  connection: Connection,
  client: MongoClient
) => {
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

  const fileDownloads = parsedMetadata.map((m) => fetchFile(m.data.uri));
  const results: (IMetadataExtension | undefined)[] = (await Promise.all(fileDownloads));
  const fullData = metadata.map((m, i) => ({
    raw: m,
    parsed: parsedMetadata[i],
    ext: results[i],
  }));

  const metadataDocuments = fullData.map(m =>
    new MetadataAccountDocument(
      store,
      m.raw.account,
      m.raw.pubkey,
      m.parsed.mint,
      m.ext?.collection?.name,
      m.parsed.data.creators?.map((c) => c.address)!
    ));

  accountConverterSet.applyConversion(metadataDocuments);
  const coll = client.db(DB).collection(METADATA_COLLECTION);

  await coll.deleteMany({});
  await coll.createIndex({store :1});
  await coll.createIndex({mint:1});
  await coll.createIndex({collection:1});
  await coll.createIndex({creators:1});
  await coll.createIndex({pubkey:1});
  await coll.insertMany(metadataDocuments);
};
