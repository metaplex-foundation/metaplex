import { createInMemoryApi, warmUpInMemoryApi } from "../utils/memoryApi";
import { config } from "dotenv";
import logger from "../logger";
import { extendBorsh } from "../common";
import { startApolloServer } from "../utils/startApolloServer";

async function main() {
  extendBorsh(); // it's need for proper work of decoding
  config();
  logger.info(
    `Env: NODE_ENV: ${process.env.NODE_ENV}, NETWORK: ${process.env.NETWORK}`
  );
  const api = createInMemoryApi({
    networkName: process.env.NETWORK,
    snapshotPath: process.env.SNAPSHOT,
  });
  const { start } = await startApolloServer(api);
  start();
  if (!process.env.WARM_UP_DISABLE) {
    warmUpInMemoryApi(api);
  }
}

// start program
main();
