import express, {Request, Response} from 'express';
import { createMongoClient, DB, BID_REDEMPTION_TICKETS_V2_COLLECTION } from '../db/mongo-utils';
import { BidRedemptionTicketV2AccountDocument } from '../solana/accounts/bidRedemptionTicket';

const router = express.Router();
router.get('/bidRedemptionTicketsV2', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(BID_REDEMPTION_TICKETS_V2_COLLECTION);
        const store = req.params.store;

        const filter : any = {
        }

        if(req.query.pubkey) {
            filter.pubkey = req.query.pubkey;
        }

        if(req.query.auctionManager) {
            filter.auctionManager = req.query.auctionManager;
        }

        if(req.query.index) {
            filter.winnerIndex = req.query.index
        }

        const cursor = coll.find<BidRedemptionTicketV2AccountDocument>(filter);
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

export {router as bidRedemptionTicketsV2Router}