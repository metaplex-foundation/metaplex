import { createDbApi } from "../utils/createDbApi";
import { createOrm } from "../utils/createOrm";
import { config } from "dotenv";
import logger from "../logger";
import { extendBorsh } from "../common";
import { startApolloServer } from "../utils/startApolloServer";

async function main() {
  extendBorsh(); // it's need for proper work of decoding
  config();
  const DB =
    process.env.DB ??
    "mongodb://127.0.0.1:27017/?readPreference=primary&directConnection=true&ssl=false";
  const networkName = process.env.NETWORK ?? "devnet";
  logger.info(`Env: NODE_ENV: ${process.env.NODE_ENV}, DB: ${DB}`);
  const db = await createOrm(DB);
  const api = createDbApi({
    networkName: networkName,
    snapshotPath: "",
    db,
  });
  startApolloServer(api);
}

// start program
main();
