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
  try {
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
        isPotEmpty : c.isPotEmpty
      }))
    );
  }
  finally {
      client.close();
  }
});

router.post("/:store/winnerBidderPots", async (req: Request, res: Response) => {
  if(!req.body.winners) {
    res.sendStatus(400);
    return;
  }

  if(!req.body.auction) {
    res.sendStatus(400);
    return;
  }

  const winnerList = req.body.winners as string[];

  const filter = {
    bidderPubkey : {
      $in : winnerList,
    },
    auctionPubkey : req.body.auction,
    isPotEmpty : 0
  }

  console.log(filter);
  const client = await createMongoClient();
  try {
    const coll = client.db(DB).collection(BIDDER_POT_COLLECTION);
    const results = await coll
      .find<BidderPotStoreAccountDocument>(filter)
      .toArray();

    res.send(
      results.map((c) => ({
        bidder: c.bidderPubkey,
        auction: c.auctionPubkey,
        pubkey: c.pubkey,
        account: c.account,
        isPotEmpty : c.isPotEmpty
      }))
    );
  }
  finally {
    client.close();
  }
});

export { router as bidderPotRouter };
