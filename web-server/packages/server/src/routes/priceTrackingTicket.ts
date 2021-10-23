import express, {Request, Response} from 'express';
import { createMongoClient, CREATORS_COLLECTION, DB, EDITIONS_COLLECTION, PRIZE_TRACKING_TICKETS_COLLECTION } from '../db/mongo-utils';
import { AccountDocument, StoreAccountDocument } from '../solana/accounts/account';

const router = express.Router();
router.get('/prizeTrackingTickets', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    const coll = client.db(DB).collection(PRIZE_TRACKING_TICKETS_COLLECTION);
    const filter : any = {
    }
    if(req.query.pubkey) {
        filter.pubkey = req.query.pubkey;
    }

    const cursor = coll.find<AccountDocument>(filter);
    const data = await cursor.toArray();
    res.send(data.map(c => ({
        pubkey: c.pubkey,
        account: c.account
    })));
})

export {router as prizeTrackingTicketRouter}