import { Connection } from "@solana/web3.js";
import { MongoClient } from "mongodb";
import { accountConverterSet, AccountDocument, StoreAccountDocument } from "../accounts/account";
import { METAPLEX_ID } from "../ids";
import { getProgramAccounts } from "../rpc";
import { PRIZE_TRACKING_TICKETS_COLLECTION, DB } from "../../db/mongo-utils";
export const loadPrizeTrackingTickets = async (
    connection: Connection,
    client: MongoClient
  ) => {
      const filters = [
          {
              memcmp : {
                  offset : 0,
                  bytes : "9"
              }
          }
      ]
    const prizeTrackingTicketAccounts =  await getProgramAccounts(connection, METAPLEX_ID, filters);
    const docs = prizeTrackingTicketAccounts.map(t => new AccountDocument(
        t.pubkey,
        t.account
    ));

    const collection = client.db(DB).collection(PRIZE_TRACKING_TICKETS_COLLECTION);
    await collection.deleteMany({});
    await collection.createIndex({pubkey : 1});

    if(docs.length > 0) {
        accountConverterSet.applyConversion(docs);
        await collection.insertMany(docs);
    }
  }