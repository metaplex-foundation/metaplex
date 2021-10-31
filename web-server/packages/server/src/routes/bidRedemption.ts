import { PublicKey } from "@solana/web3.js";
import express, { Request, Response } from "express";
import {
  createMongoClient,
  DB,
  BIDDER_POT_COLLECTION,
  BID_REDEMPTION_TICKETS_V1_COLLECTION,
  BID_REDEMPTION_TICKETS_V2_COLLECTION,
  AUCTION_COLLECTION,
  AUCTION_MANAGERS_COLLECTION,
  BIDDER_METADATA_COLLECTION,
} from "../db/mongo-utils";
import { accountConverterSet, AccountDocument } from "../solana/accounts/account";
import { AuctionManagerAccountDocument, AUCTION_PREFIX, decodeAuctionManager, METADATA } from "../solana/accounts/auctionManager";
import { BidderPotStoreAccountDocument } from "../solana/accounts/bidderPot";
import { METAPLEX_PREFIX } from "../solana/accounts/types";
import { AUCTION_ID, METAPLEX_ID, StringPublicKey, toPublicKey } from "../solana/ids";
import { findProgramAddressBase58 } from "../solana/utils";

const router = express.Router();
router.get("/wallet/:wallet/auction/:auction/bidRedemption", async (req: Request, res: Response) => {
  const client = await createMongoClient();
  try {
    let walletPubKey : string = req.params.wallet as string;
    const auctionPubKey : string = req.params.auction as string;

    if(!walletPubKey || !auctionPubKey) {
        res.sendStatus(400);
        return;
    }

    const bidderMetadataPubkey : StringPublicKey = (
        await findProgramAddressBase58(
          [
            Buffer.from(AUCTION_PREFIX),
            toPublicKey(AUCTION_ID).toBuffer(),
            toPublicKey(auctionPubKey).toBuffer(),
            toPublicKey(walletPubKey).toBuffer(),
            Buffer.from(METADATA),
          ],
          toPublicKey(AUCTION_ID),
        )
      )[0];

     const bidRedemption = (
        await findProgramAddressBase58(
          [
            Buffer.from(METAPLEX_PREFIX),
            toPublicKey(auctionPubKey).toBuffer(),
            toPublicKey(bidderMetadataPubkey).toBuffer(),
          ],
          toPublicKey(METAPLEX_ID),
        )
      )[0];

    const filter = {
        pubkey : bidRedemption
    }

    const v1Coll = client.db(DB).collection(BID_REDEMPTION_TICKETS_V1_COLLECTION);

    const v1Ticket= await v1Coll.findOne(filter);

    if(v1Ticket) {
        res.send(v1Ticket);
    }

    const v2Coll = client.db(DB).collection(BID_REDEMPTION_TICKETS_V2_COLLECTION);

    const v2Ticket = await v2Coll.findOne(filter);

    if(v2Ticket) {
        res.send(v2Ticket);
        return;
    }

    res.sendStatus(404);
  }
  catch(err) {
      console.log(err);
  }
  finally {
      client.close();
  }
});

export { router as bidRedemptionRouter };
