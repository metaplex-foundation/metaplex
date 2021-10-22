import express from "express";
import bodyParser from "body-parser";
import { creatorsRouter } from "./routes/creator";
import { loadMetaplexData } from "./solana";
import { AuctionData } from "./solana/accounts/auction/auction";
import { createDevNetConnection } from "./solana/connection";
import { createMongoClient } from "./db/mongo-utils";
import { API_BASE } from "./routes/base";
import { metadataRouter } from "./routes/metadata";
import { editionsRouter } from "./routes/edition";
import { masterEditionsV1Router } from "./routes/masterEditionV1";
import { masterEditionsV2Router } from "./routes/masterEditionV2";

const app = express();
app.use(express.json());
app.use(API_BASE, creatorsRouter);
app.use(API_BASE, metadataRouter);
app.use(API_BASE, editionsRouter);
app.use(API_BASE, masterEditionsV1Router);
app.use(API_BASE, masterEditionsV2Router);

loadMetaplexData();

app.listen(3001, () => {
  console.log("server is listening biaaatch");
});
