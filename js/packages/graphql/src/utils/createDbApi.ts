import { ENDPOINTS, MetaplexApiDataSource } from "../api";
import logger from "../logger";
import { MongoApi } from "../api/mongo";
import { snapshot } from "../api/snapshot";
import { Db } from "mongodb";

export function createDbApi({
  db,
  networkName,
  snapshotPath,
}: {
  db: Db;
  networkName?: string;
  snapshotPath?: string;
}) {
  const endpoints = networkName
    ? ENDPOINTS.filter(({ name }) => name === networkName)
    : ENDPOINTS;

  logger.info(
    `Api works with networks: ${endpoints.map((p) => p.name).join(", ")}`
  );

  const entries = endpoints.map(({ name, endpoint }) =>
    MongoApi.build(db, name, endpoint)
  );

  const api = new MetaplexApiDataSource(entries);
  if (snapshotPath) {
    const dir = [":tmp", "1", "true"].includes(snapshotPath)
      ? undefined
      : snapshotPath;

    logger.info(`📖 Start read/write from/to snapshot`);

    Promise.all(entries.map((entry) => snapshot(entry, dir))).catch((err) => {
      logger.info("❌ Snapshot error", err);
    });
  }
  return api;
}
