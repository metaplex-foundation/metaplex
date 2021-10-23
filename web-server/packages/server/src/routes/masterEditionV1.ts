import express, {Request, Response} from 'express';
import { createMongoClient, CREATORS_COLLECTION, DB, EDITIONS_COLLECTION, MASTER_EDITIONS_V1_COLLECTION } from '../db/mongo-utils';
import { StoreAccountDocument } from '../solana/accounts/account';
import { MasterEditionV1AccountDocument } from '../solana/accounts/metadata';

const router = express.Router();
router.get('/:store/masterEditionsV1', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    const coll = client.db(DB).collection(MASTER_EDITIONS_V1_COLLECTION);
    const store = req.params.store;
    const filter : any = {
        store: store
    }
    if(req.query.pubkey) {
        filter.pubkey = req.query.pubkey;
    }

    if(req.query.printingMint) {
        filter.printingMint = req.query.printingMint;
    }

    if(req.query.oneTimePrintingAuthorizationMint) {
        filter.oneTimePrintingAuthorizationMint = req.query.oneTimePrintingAuthorizationMint;
    }

    const cursor = coll.find<MasterEditionV1AccountDocument>(filter);
    const data = await cursor.toArray();
    res.send(data.map(c => ({
        pubkey: c.pubkey,
        account: c.account
    })));
})

export {router as masterEditionsV1Router}