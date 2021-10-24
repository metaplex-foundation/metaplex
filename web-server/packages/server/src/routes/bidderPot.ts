import express, { Request, Response } from "express";
import {
  createMongoClient,
  DB,
  BIDDER_POT_COLLECTION,
} from "../db/mongo-utils";
import { BidderPotStoreAccountDocument } from "../solana/accounts/bidderPot";

const router = express.Router();
router.get("/:store/bidderPots", async (req: Request, res: Response) => {
  const client = await createMongoClient();
  const coll = client.db(DB).collection(BIDDER_POT_COLLECTION);
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

  const cursor = coll.find<BidderPotStoreAccountDocument>(filter);
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

export { router as bidderPotRouter };
