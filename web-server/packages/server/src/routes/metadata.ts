import express, {Request, Response} from 'express';
import { createSolutionBuilderWithWatch } from 'typescript';
import { createMongoClient, METADATA_COLLECTION, DB, STORE_COLLECTIONS } from '../db/mongo-utils';
import { MetadataAccountDocument } from '../solana/accounts/metadata';
import { MetaplexStoreAccountDocument } from '../solana/accounts/store';

const router = express.Router();
router.get('/:store/metadata', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(METADATA_COLLECTION);
        const store = req.params.store;

        const filter: any = {
            store: store
        }
        if(req.query.mint) {
            filter.mint = req.query.mint;
        }

        if(req.query.pubkey) {
            filter.pubkey = req.query.pubkey;
        }

        if(req.query.collection) {
            filter.collection = req.query.collection;
        }

        if(req.query.creator) {
            filter["creators.address"] = req.query.creator;
        }

        const cursor = coll.find<MetadataAccountDocument>(filter);
        const data = await cursor.toArray();
        res.send(data.map(c => ({
            pubkey: c.pubkey,
            account: c.account,
        })));
    }
    finally{
        client.close();
    }
})

router.get('/:store/metadata/total', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(METADATA_COLLECTION);
        const store = req.params.store;
        const results = await coll.aggregate(  [
            {
              $match: {
                store: store
              }
            },
            {
              $count: "nftCount"
            }
          ]).toArray();

          res.send(results[0])
    }
    finally {
        client.close();
    }
});

router.get('/:store/:creatorWalletPubKey/metadataNeedingApproval', async (req: Request, res: Response) => {
    const client = await createMongoClient();
    try {
        const coll = client.db(DB).collection(METADATA_COLLECTION);
        const store = req.params.store;
        const creatorWalletPubKey = req.params.creatorWalletPubKey;

        const nonPublicStores = await client
          .db(DB)
          .collection(STORE_COLLECTIONS)
          .find({ store: store, isPublic: 0 })
          .toArray();

        const aggr : any = [
            {
                $unwind : "$creators"
            },
            {
                $match : {
                    "creators.address" : creatorWalletPubKey,
                    "creators.verified" : 0
                }
            },
            {
                $lookup: {
                    from: "whiteListedCreators",
                    localField: "updateAuthority",
                    foreignField: "walletAddress",
                    as: "updateAuthorityFull",
                  }
            }
        ];

        if(nonPublicStores.length) {
            aggr.push({
                $match : {
                    "updateAuthorityFull.activated" : 1
                }
            })
        }

        const results = await coll.aggregate(aggr).toArray();

        res.send(results.map(r => ({
            pubkey : r.pubkey,
            account: r.account
        })));
    }
    finally {
        client.close();
    }
});

export {router as metadataRouter}