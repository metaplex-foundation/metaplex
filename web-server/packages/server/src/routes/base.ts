import { createMongoClient, DB } from "../db/mongo-utils";
import express, {Request, Response} from 'express';
import { StoreAccountDocument } from "../solana/accounts/account";

export const API_BASE = "/api"


const genericStoreDocumentHandler = (collection : string) => {
    const handler = async (req: Request, res: Response) => {
        const client = await createMongoClient();
        const coll = client.db(DB).collection(collection);

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
    return handler;
}

export const getStoreGenericRouter = (collection : string) => {
    const router = express.Router();
    router.get('/:store/' + collection, genericStoreDocumentHandler(collection));
    return router;
}