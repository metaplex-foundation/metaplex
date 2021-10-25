import express, { Request, Response } from "express";
import {
  createMongoClient,
  DB,
  STORE_COLLECTIONS as STORE_COLLECTION,
} from "../db/mongo-utils";

export type Store = {
  address: string;
};

const router = express.Router();
router.post("/store", async (req: Request, res: Response) => {
  const client = await createMongoClient();
  try {
    const coll = client.db(DB).collection<Store>(STORE_COLLECTION);

    if (req.body.address) {
      const store: Store = {
        address: req.body.address,
      };

      const result = await coll.insertOne(store);
      res.send(result.insertedId);
    } else {
      res.sendStatus(400);
    }
  } finally {
    client.close();
  }
});

export { router as storeRouter };
