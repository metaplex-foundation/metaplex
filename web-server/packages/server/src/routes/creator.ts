import express, {Request, Response} from 'express';
import { createMongoClient, CREATORS_COLLECTION, DB } from '../db/mongo-utils';
import { accountConverterSet, StoreAccountDocument } from '../solana/accounts/account';

const router = express.Router();
router.get('/:store/creators', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    const coll = client.db(DB).collection(CREATORS_COLLECTION);
    const store = req.params.store;
    const cursor = coll.find<StoreAccountDocument>({store: store});
    const data = await cursor.toArray();
    res.send(data.map(c => ({
        pubkey: c.pubkey,
        account: c.account
    })));
})

export {router as creatorsRouter}