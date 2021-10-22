import express from "express";
import bodyParser from "body-parser";
import { creatorsRouter } from "./routes/creator";
import { loadMetaplexData } from "./solana";
import { AuctionData } from "./solana/accounts/auction/auction";
import {BN} from 'bn.js'
import { createDevNetConnection } from "./solana/connection";
import { createMongoClient } from "./db/mongo-utils";
import { API_BASE } from "./routes/base";
import { metadataRouter } from "./routes/metadata";

const app = express();
app.use(express.json());
app.use(API_BASE, creatorsRouter);
app.use(API_BASE, metadataRouter);

loadMetaplexData();

app.listen(3001, () => {
  console.log("server is listening biaaatch");
});
