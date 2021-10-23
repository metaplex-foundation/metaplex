import { Connection } from "@solana/web3.js";
import { raw } from "body-parser";
import { Db, MongoClient } from "mongodb";
import { BID_REDEMPTION_TICKETS_V2_COLLECTION, DB } from "../../db/mongo-utils";
import { accountConverterSet } from "../accounts/account";
import {
  BidRedemptionTicketV2,
  BidRedemptionTicketV2AccountDocument,
  bidRedemptionV2Converters,
  decodeBidRedemptionTicket,
} from "../accounts/bidRedemptionTicket";
import { METAPLEX_ID, StringPublicKey } from "../ids";
import { getProgramAccounts } from "../rpc";
import { bnConverter } from "../serialization/converters/bnConverter";
import { ConverterSet } from "../serialization/converterSet";

export const loadBidRedemptionTicketsV2 = async (
  connection: Connection,
  client: MongoClient
) => {
  const filters = [
    {
      memcmp: {
        offset: 0,
        bytes: "C",
      },
    },
  ];

  const rawData = await getProgramAccounts(connection, METAPLEX_ID, filters);
  const docs = rawData.map((ticket) => {
    const info = decodeBidRedemptionTicket(
      ticket.account.data
    ) as BidRedemptionTicketV2;
    const doc = new BidRedemptionTicketV2AccountDocument(
      ticket.pubkey,
      ticket.account,
      info.auctionManager,
      info.winnerIndex
    );
    return doc;
  });

  const collection = client
    .db(DB)
    .collection(BID_REDEMPTION_TICKETS_V2_COLLECTION);
  collection.deleteMany({});
  collection.createIndex({ pubkey: 1 });
  collection.createIndex({ auctionManager: 1 });
  collection.createIndex({ winnerIndex: 1 });

  if (docs.length) {
    bidRedemptionV2Converters.applyConversion(docs);
    await collection.insertMany(docs);
  }
};
