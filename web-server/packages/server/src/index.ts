import express from "express";
import { creatorsRouter } from "./routes/creator";
import { loadMetaplexData } from "./solana";
import { API_BASE } from "./routes/base";
import { metadataRouter } from "./routes/metadata";
import { editionsRouter } from "./routes/edition";
import { masterEditionsV1Router } from "./routes/masterEditionV1";
import { masterEditionsV2Router } from "./routes/masterEditionV2";
import { prizeTrackingTicketRouter } from "./routes/priceTrackingTicket";
import { auctionManagerRouter } from "./routes/auctionManager";
import { vaultRouter as vaultsRouter } from "./routes/vault";
import { auctionsRouter } from "./routes/auction";
import { auctionDataExtended } from "./routes/auctionDataExtended";
import { safetyDepositBoxesRouter } from "./routes/safetyDepositBox";
import { safetyDepositConfigsRouter } from "./routes/safetyDepositConfig";
import { storeRouter } from "./routes/store";
import { bidRedemptionTicketsV2Router } from "./routes/bidRedemptionTicketV2";
import { bidRedemptionTicketsV1Router } from "./routes/bidRedemptionTicketV1";
import { payoutTicketsRouter } from "./routes/payoutTicket";
import { bidderMetadataRouter } from "./routes/bidderMetadata";
import { bidderPotRouter } from "./routes/bidderPot";
import 'log-timestamp';
import { bidRedemptionRouter } from "./routes/bidRedemption";

console.log('ENVIRONMENT', process.env);
const cors = require('cors');
const app = express();
app.use(cors())
app.use(express.json());
app.use(API_BASE, creatorsRouter);
app.use(API_BASE, metadataRouter);
app.use(API_BASE, editionsRouter);
app.use(API_BASE, masterEditionsV1Router);
app.use(API_BASE, masterEditionsV2Router);
app.use(API_BASE, prizeTrackingTicketRouter);
app.use(API_BASE, auctionManagerRouter);
app.use(API_BASE, vaultsRouter);
app.use(API_BASE, auctionsRouter);
app.use(API_BASE, auctionDataExtended);
app.use(API_BASE, safetyDepositBoxesRouter);
app.use(API_BASE, safetyDepositConfigsRouter);
app.use(API_BASE, storeRouter);
app.use(API_BASE, bidRedemptionTicketsV2Router);
app.use(API_BASE, bidRedemptionTicketsV1Router);
app.use(API_BASE, payoutTicketsRouter);
app.use(API_BASE, bidderMetadataRouter);
app.use(API_BASE, bidderPotRouter);
app.use(API_BASE, bidRedemptionRouter);

if(process.env.NODE_ENV == 'development') {
  loadMetaplexData();
}

app.listen(process.env.HOST_PORT, () => {
  console.log("server is listening at " + process.env.HOST_PORT);
});
