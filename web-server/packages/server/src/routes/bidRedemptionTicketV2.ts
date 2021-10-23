import express, {Request, Response} from 'express';
import { fill } from 'lodash';
import { createMongoClient, METADATA_COLLECTION, DB, SAFETY_DEPOSIT_BOX_COLLECTION, SAFETY_DEPOSIT_CONFIG_COLLECTION, BID_REDEMPTION_TICKETS_V2_COLLECTION } from '../db/mongo-utils';
import { accountConverterSet, StoreAccountDocument } from '../solana/accounts/account';
import { BidRedemptionTicketV2AccountDocument } from '../solana/accounts/bidRedemptionTicket';
import { decodeMetadata, MetadataAccountDocument } from '../solana/accounts/metadata';
import { SafetyDepositBoxAccountDocument } from '../solana/accounts/safetyDepositBox';
import { SafetyDepositConfigAccountDocument } from '../solana/accounts/safetyDepositConfig';

const router = express.Router();
router.get('/bidRedemptionTicketsV2', async (req: Request, res: Response) => {
    const client = await createMongoClient();
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
})

export {router as bidRedemptionTicketsV2Router}