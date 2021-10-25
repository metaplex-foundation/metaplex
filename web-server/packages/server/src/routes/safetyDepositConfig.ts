import express, { Request, Response } from "express";
import {
  createMongoClient,
  DB,
  SAFETY_DEPOSIT_CONFIG_COLLECTION,
} from "../db/mongo-utils";
import { SafetyDepositConfigAccountDocument } from "../solana/accounts/safetyDepositConfig";

const router = express.Router();
router.get(
  "/:store/safetyDepositConfigs",
  async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
      const coll = client.db(DB).collection(SAFETY_DEPOSIT_CONFIG_COLLECTION);
      const store = req.params.store;

      const filter: any = {
        store: store,
      };

      if (req.query.pubkey) {
        filter.pubkey = req.query.pubkey;
      }

      if (req.query.auctionManager) {
        filter.auctionManager = req.query.auctionManager;
      }

      if (req.query.index) {
        filter.order = req.query.index;
      }

      const cursor = coll.find<SafetyDepositConfigAccountDocument>(filter);
      const data = await cursor.toArray();
      res.send(
        data.map((c) => ({
          pubkey: c.pubkey,
          account: c.account,
        }))
      );
    } finally {
      client.close();
    }
  }
);

export { router as safetyDepositConfigsRouter };
