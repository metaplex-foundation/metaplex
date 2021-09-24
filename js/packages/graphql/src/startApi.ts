import { performance } from "perf_hooks";
import { ENDPOINTS, MetaplexApiDataSource } from "./api";
import { snapshot } from "./api/snapshot";
import logger from "./logger";
export const startApi = () => {
  const endpoints = process.env.NETWORK
    ? ENDPOINTS.filter(({ name }) => name === process.env.NETWORK)
    : ENDPOINTS;

  logger.info(
    `Api works with networks: ${endpoints.map((p) => p.name).join(", ")}`
  );

  const api = new MetaplexApiDataSource(endpoints);

  if (process.env.SNAPSHOT) {
    const dir = [":tmp", "1", "true"].includes(process.env.SNAPSHOT)
      ? undefined
      : process.env.SNAPSHOT;
    snapshot(api, dir).catch((err) => {
      logger.info("❌ Snapshot error", err);
    });
  }

  return api;
};

export const warmUp = async (api: MetaplexApiDataSource) => {
  if (!process.env.WARM_UP_DISABLE) {
    logger.info("🌋 Start warm up data");
    const start = performance.now();
    await api.preload();
    const end = performance.now();
    logger.info(`🌋 Finish warm up data ${((end - start) / 1000).toFixed(0)}s`);
  }
};
