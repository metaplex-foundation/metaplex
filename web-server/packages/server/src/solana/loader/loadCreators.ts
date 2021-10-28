import { AUCTION_ID, METAPLEX_ID, StringPublicKey } from "../ids";
import { MongoClient } from "mongodb";
import { createDevNetConnection } from "../connection";
import { getProgramAccounts } from "../rpc";
import { Connection } from "@solana/web3.js";
import {
  CreatorAccountDocument,
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
  console.log('Loading creators...');
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
    .map(
      (res) =>
        new CreatorAccountDocument(
          store,
          res?.Raw.pubkey!,
          res?.Raw.account!,
          res?.Parsed.activated!,
          res?.Parsed.address!
        )
    );

  storeCreators.forEach((creator) =>
    accountConverterSet.applyConversion(creator)
  );


  const coll = client.db(DB).collection(CREATORS_COLLECTION);
  await coll.deleteMany({store : store});
  if(storeCreators.length > 0) {
    try {
      await coll.insertMany(storeCreators);
    }
    catch(err) {
      console.log(err);
    }
  }

  console.log('Creators loaded');
  return parsedAccounts;
};
