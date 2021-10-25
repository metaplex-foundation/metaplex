import express, { Request, Response } from "express";
import {
  createMongoClient,
  METADATA_COLLECTION,
  DB,
  VAULTS_COLLECTION,
} from "../db/mongo-utils";
import {
  accountConverterSet,
  StoreAccountDocument,
} from "../solana/accounts/account";
import { VaultAccountDocument, VaultState } from "../solana/accounts/vault";

const router = express.Router();

router.get("/:store/vaults", async (req: Request, res: Response) => {
  const client = await createMongoClient();
  try {
    const coll = client.db(DB).collection(VAULTS_COLLECTION);
    const store = req.params.store;

    const filter: any = {
      store: store,
    };

    if (req.query.pubkey) {
      filter.pubkey = req.query.pubkey;
    }

    const cursor = coll.find<VaultAccountDocument>(filter);
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
});

router.get(
  "/:store/wallet/:wallet/vaultsToUnwind",
  async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
      const coll = client.db(DB).collection(VAULTS_COLLECTION);
      const store = req.params.store;
      const wallet = req.params.wallet;

      const filter: any = {
        store: store,
        authority: wallet,
        state: {
          $ne: VaultState.Deactivated,
        },
        tokenTypeCount: {
          $gt: 0,
        },
      };
      const cursor = coll.find<VaultAccountDocument>(filter);
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

export { router as vaultRouter };
