import { createMongoClient, DB } from "../db/mongo-utils";
import express, {Request, Response} from 'express';
import { AccountDocument, StoreAccountDocument } from "../solana/accounts/account";

export const API_BASE = "/api"


const genericStoreDocumentHandler = (collection : string) => {
    const handler = async (req: Request, res: Response) => {
        const client = await createMongoClient();
        try {
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
        finally {
            client.close();
        }
    }
    return handler;
}

const genericDocumentHandler = (collection : string) => {
    const handler = async (req: Request, res: Response) => {
        const client = await createMongoClient();
        try {
            const coll = client.db(DB).collection(collection);

            const store = req.params.store;
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
        }
        finally {
            client.close();
        }
    }
    return handler;
}

export const getGenericStoreCollectionRouter = (collection : string) => {
    const router = express.Router();
    router.get('/:store/' + collection, genericStoreDocumentHandler(collection));
    return router;
}

export const getGenericCollectionRouter  = (collection : string) => {
    const router = express.Router();
    router.get('/' + collection, genericDocumentHandler(collection))
    return router;
}