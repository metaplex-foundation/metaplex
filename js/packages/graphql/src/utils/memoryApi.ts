import { performance } from "perf_hooks";
import { ENDPOINTS, MemoryApi, MetaplexApiDataSource } from "../api";
import { snapshot } from "../api/snapshot";
import logger from "../logger";

function initFlowControl(size: number) {
  const len = size - 1;
  const promises = new Array<Promise<void>>(len);
  const resolvers = new Array<() => void>(len);
  for (let i = 0; i < len; i++) {
    promises[i] = new Promise((resolve) => (resolvers[i] = resolve));
  }
  const result = new Array<{ promise: Promise<void>; finish: () => void }>(
    size
  );
  for (let i = 0; i < size; i++) {
    const finish = i + 1 === size ? () => {} : resolvers[i];
    const promise = i ? promises[i - 1] : Promise.resolve();
    result[i] = { promise, finish };
  }
  return result;
}

export const createInMemoryApi = ({
  networkName,
  snapshotPath,
}: {
  networkName?: string;
  snapshotPath?: string;
}) => {
  const endpoints = networkName
    ? ENDPOINTS.filter(({ name }) => name === networkName)
    : ENDPOINTS;

  logger.info(
    `Api works with networks: ${endpoints.map((p) => p.name).join(", ")}`
  );

  const flowControl = initFlowControl(endpoints.length);

  const entries = endpoints.map(({ name, endpoint }, index) =>
    MemoryApi.build(name, endpoint, flowControl[index])
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
};

export const warmUpInMemoryApi = async (api: MetaplexApiDataSource) => {
  logger.info("🌋 Start warm up data");
  const start = performance.now();
  await api.preload();
  const end = performance.now();
  logger.info(`🌋 Finish warm up data ${((end - start) / 1000).toFixed(0)}s`);
};
