import express, {Request, Response} from 'express';
import { AUCTION_MANAGERS_COLLECTION, createMongoClient, CREATORS_COLLECTION, DB, EDITIONS_COLLECTION, PRIZE_TRACKING_TICKETS_COLLECTION } from '../db/mongo-utils';
import { AuctionManagerAccountDocument } from '../solana/accounts/auctionManager';

const router = express.Router();
router.get('/:store/auctionManagers', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(AUCTION_MANAGERS_COLLECTION);
        const store = req.params.store;
        const filter : any = {
            store: store
        }
        if(req.query.pubkey) {
            filter.pubkey = req.query.pubkey;
        }

        if(req.query.auction) {
            filter.auction = req.query.auction
        }

        if(req.query.collection) {
            filter.collection = req.query.collection;
        }

        const cursor = coll.find<AuctionManagerAccountDocument>(filter);
        const data = await cursor.toArray();
        res.send(data);
    }
    finally {
        client.close();
    }
})

export {router as auctionManagerRouter}