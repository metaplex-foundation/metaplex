import express, {Request, Response} from 'express';
import { createMongoClient, CREATORS_COLLECTION, DB, EDITIONS_COLLECTION, MASTER_EDITIONS_V2_COLLECTION } from '../db/mongo-utils';
import { StoreAccountDocument } from '../solana/accounts/account';

const router = express.Router();
router.get('/:store/masterEditionsV2', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(MASTER_EDITIONS_V2_COLLECTION);
        const store = req.params.store;
        const filter : any = {
            store: store
        }
        if(req.query.pubkey) {
            filter.pubkey = req.query.pubkey;
        }

        const cursor = coll.find<StoreAccountDocument>(filter);
        const data = await cursor.toArray();
        res.send(data.map(c => ({
            pubkey: c.pubkey,
            account: c.account
        })));
    }
    finally {
        client.close();
    }
})

export {router as masterEditionsV2Router}