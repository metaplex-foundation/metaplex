import express, {Request, Response} from 'express';
import { createMongoClient, METADATA_COLLECTION, DB } from '../db/mongo-utils';
import { MetadataAccountDocument } from '../solana/accounts/metadata';

const router = express.Router();
router.get('/:store/metadata', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(METADATA_COLLECTION);
        const store = req.params.store;

        const filter: any = {
            store: store
        }
        if(req.query.mint) {
            filter.mint = req.query.mint;
        }

        if(req.query.pubkey) {
            filter.pubkey = req.query.pubkey;
        }

        if(req.query.collection) {
            filter.collection = req.query.collection;
        }

        if(req.query.creator) {
            filter.creators = req.query.creator;
        }

        const cursor = coll.find<MetadataAccountDocument>(filter);
        const data = await cursor.toArray();
        res.send(data.map(c => ({
            pubkey: c.pubkey,
            account: c.account,
        })));
    }
    finally{
        client.close();
    }
})

router.get('/:store/metadata/total', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(METADATA_COLLECTION);
        const store = req.params.store;
        const results = await coll.aggregate(  [
            {
              $match: {
                store: store
              }
            },
            {
              $count: "nftCount"
            }
          ]).toArray();

          res.send(results[0])
    }
    finally {
        client.close();
    }
});

export {router as metadataRouter}