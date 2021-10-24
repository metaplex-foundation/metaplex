import { Connection } from "@solana/web3.js";
import { MongoClient } from "mongodb";
import {
  BID_REDEMPTION_TICKETS_V1_COLLECTION,
  DB,
} from "../../db/mongo-utils";
import { accountConverterSet, AccountDocument } from "../accounts/account";
import { METAPLEX_ID } from "../ids";
import { getProgramAccounts } from "../rpc";

export const loadBidRedemptionTicketsV1 = async (
  connection: Connection,
  client: MongoClient
) => {
  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: "3",
      },
    },
  ];

  const rawData = await getProgramAccounts(connection, METAPLEX_ID, filters);

  const docs = rawData.map((ticket) => {
    return new AccountDocument(ticket.pubkey, ticket.account);
  });

  const collection = client
    .db(DB)
    .collection(BID_REDEMPTION_TICKETS_V1_COLLECTION);

  await collection.deleteMany({});
  await collection.createIndex({ pubkey: 1 });

  if (docs.length) {
    accountConverterSet.applyConversion(docs);
    await collection.insertMany(docs);
  }
};
