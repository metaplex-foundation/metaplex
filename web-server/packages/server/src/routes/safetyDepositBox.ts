import express, {Request, Response} from 'express';
import { createMongoClient, DB, SAFETY_DEPOSIT_BOX_COLLECTION } from '../db/mongo-utils';
import { SafetyDepositBoxAccountDocument } from '../solana/accounts/safetyDepositBox';

const router = express.Router();
router.get('/:store/safetyDepositBoxes', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(SAFETY_DEPOSIT_BOX_COLLECTION);
        const store = req.params.store;

        const filter: any = {
            store: store
        }

        if(req.query.pubkey) {
            filter.pubkey = req.query.pubkey;
        }

        if(req.query.vault) {
            filter.vault = req.query.vault;
        }

        if(req.query.index) {
            filter.order = parseInt(req.query.index as string)
        }

        const cursor = coll.find<SafetyDepositBoxAccountDocument>(filter);
        const data = await cursor.toArray();
        res.send(data.map(c => ({
            pubkey: c.pubkey,
            account: c.account,
        })));
    }
    finally {
        client.close();
    }
})

export {router as safetyDepositBoxesRouter}