import express, { Request, Response } from "express";
import {
  createMongoClient,
  DB,
  STORE_COLLECTIONS as STORE_COLLECTION,
} from "../db/mongo-utils";
import { accountConverterSet } from "../solana/accounts/account";
import { decodeStore, MetaplexStoreAccountDocument } from "../solana/accounts/store";
import { createDevNetConnection } from "../solana/connection";
import { METAPLEX_ID } from "../solana/ids";
import { getProgramAccounts } from "../solana/rpc";

export type CreateStoreRequest = {
  address: string;
};

const router = express.Router();
router.post("/store", async (req: Request, res: Response) => {
  const client = await createMongoClient();
  try {
    const coll = client.db(DB).collection<MetaplexStoreAccountDocument>(STORE_COLLECTION);

    if ((req.body as CreateStoreRequest).address) {
      const createRequest = req.body as CreateStoreRequest;

      const connection = createDevNetConnection();

      const filter = [
        {
          memcmp: {
            offset: 0,
            bytes: "4",
          },
        },
      ]

      const storeAccounts = await getProgramAccounts(
        connection,
        METAPLEX_ID,
        filter
      );

      if(!storeAccounts.length) {
        res.sendStatus(400);
        return;
      }

      const storeAccount = storeAccounts[0];

      const store = decodeStore(storeAccount.account.data);

      const doc = new MetaplexStoreAccountDocument(
        createRequest.address,
        storeAccount.pubkey,
        storeAccount.account,
        store.public
        );

      accountConverterSet.applyConversion(doc);
      const result = await coll.insertOne(doc);
      res.send(result.insertedId);
    } else {
      res.sendStatus(400);
    }
  } finally {
    client.close();
  }
});

export { router as storeRouter };
