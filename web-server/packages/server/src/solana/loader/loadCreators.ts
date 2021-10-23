import { AUCTION_ID, METAPLEX_ID, StringPublicKey } from "../ids";
import { MongoClient } from "mongodb";
import { createDevNetConnection } from "../connection";
import { getProgramAccounts } from "../rpc";
import { Connection } from "@solana/web3.js";
import {
  decodeWhitelistedCreator,
  isCreatorPartOfTheStore
} from "../accounts/creator";
import { AccountAndPubkey } from "../types";
import { accountConverterSet, StoreAccountDocument } from "../accounts/account";
import { CREATORS_COLLECTION, DB, SAFETY_DEPOSIT_CONFIG_COLLECTION } from "../../db/mongo-utils";

export const loadCreators = async (
  store: StringPublicKey,
  connection: Connection,
  client: MongoClient
) => {
  const accounts = await getProgramAccounts(connection, METAPLEX_ID, [
    {
      memcmp: {
        offset: 0,
        bytes: "5",
      },
    },
  ]);

   const parsedAccounts = accounts.map((acc) => {
    return {
      Raw: acc,
      Parsed: decodeWhitelistedCreator(acc.account.data),
    };
  });

  const promises = parsedAccounts.map(async (acc) => {
    const isInStore = await isCreatorPartOfTheStore(
      acc.Parsed.address,
      acc.Raw.pubkey,
      store
    );
    if (isInStore) {
      return acc;
    }
  });

  const results = await Promise.all(promises);

  const storeCreators = results
    .filter((res) => res)
    .map((res) => new StoreAccountDocument(store, res?.Raw.pubkey!, res?.Raw.account!));

  storeCreators.forEach((creator) =>
    accountConverterSet.applyConversion(creator)
  );
  const coll = client.db(DB).collection(CREATORS_COLLECTION);
  coll.deleteMany({store : store});
  coll.createIndex({ store: 1 });
  if(storeCreators.length > 0) {
    await coll.insertMany(storeCreators);
  }
  return parsedAccounts;
};
