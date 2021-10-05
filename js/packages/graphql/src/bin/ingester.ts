import "reflect-metadata";
import logger from "../logger";
import { createOrm } from "../utils/createOrm";
import { createDbApi } from "../utils/createDbApi";
import { extendBorsh } from "../common";
import { config } from "dotenv";

async function init() {
  extendBorsh(); // it's need for proper work of decoding
  config();
  const db = await createOrm(
    "mongodb://127.0.0.1:27017/?readPreference=primary&directConnection=true&ssl=false"
  );
  const api = createDbApi({
    db: db,
    networkName: "devnet",
    snapshotPath: "1",
  });
  logger.info("Start preloading");
  // eslint-disable-next-line no-console
  console.time("preload");
  await api.preload();
  // eslint-disable-next-line no-console
  console.timeEnd("preload");
  logger.info("Stop preloading");
}
init().catch((err) => {
  // eslint-disable-next-line no-console
  console.log(err);
  logger.error(err);
});
