import express, { Request, Response } from "express";
import {
  createMongoClient,
  DB,
  BIDDER_METADATA_COLLECTION,
} from "../db/mongo-utils";
import { BidderMetadataStoreAccountDocument } from "../solana/accounts/bidderMetadata";

const router = express.Router();
router.get("/:store/bidderMetadata", async (req: Request, res: Response) => {
  const client = await createMongoClient();
  const coll = client.db(DB).collection(BIDDER_METADATA_COLLECTION);
  const store = req.params.store;

  const filter: any = {
    store: store,
  };

  if (req.query.pubkey) {
    filter.pubkey = req.query.pubkey;
  }

  if (req.query.auction) {
    filter.auctionPubkey = req.query.auction;
  }

  if (req.query.bidder) {
    filter.bidderPubkey = req.query.bidder;
  }

  const cursor = coll.find<BidderMetadataStoreAccountDocument>(filter);
  const data = await cursor.toArray();
  res.send(
    data.map((c) => ({
      bidder: c.bidderPubkey,
      auction: c.auctionPubkey,
      pubkey: c.pubkey,
      account: c.account,
    }))
  );
});

export { router as bidderMetadataRouter };
