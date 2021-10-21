import express from "express";
import bodyParser from "body-parser";
import { sampleRouter } from "./routes/sample";
import mongoose, { Schema } from "mongoose";
import { loadAuctions } from "./solana";
import { AuctionData } from "./solana/accounts/auction/auction";
import {BN} from 'bn.js'

const app = express();
app.use(express.json());
app.use(sampleRouter);


var Any = new Schema({  }, {strict:false});

const AuctionModel = mongoose.model('AuctionData', Any);

mongoose
  .connect("mongodb://localhost:27017", {
    dbName: "testdb",
    user: "root",
    pass: "example",
  })
  .then( async () => {
    console.log("connected to db");

    const auctions = await loadAuctions();

    const a = auctions[0];
    console.log(a);
    const doc = new AuctionModel(a);
    const res = await doc.save();
    const found : AuctionData = await AuctionModel.findById(res._id);
    const testObj =new BN(3);
    //@ts-ignore

    console.log(found);
  })
  .catch((err) => {
    console.log("failed to connect to db", err);
  });

app.listen(3001, () => {
  console.log("server is listening biaaatch");
});
