import e from 'express';
import express, {Request, Response} from 'express';
import { createMongoClient, METADATA_COLLECTION, DB, STORE_COLLECTIONS as STORE_COLLECTION } from '../db/mongo-utils';

export type Store = {
    address : string
}

const router = express.Router();
router.post('/store', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    const coll = client.db(DB).collection<Store>(STORE_COLLECTION);

    if(req.body.address) {
        const store : Store = {
            address : req.body.address,
        }

        const result = await coll.insertOne(store);
        res.send(result.insertedId);
    }
    else {
        res.sendStatus(400);
    }
})

export {router as storeRouter}