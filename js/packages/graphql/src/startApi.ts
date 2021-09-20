import { performance } from "perf_hooks";
import { ENDPOINTS, MetaplexApiDataSource } from "./api";
import { snapshot } from "./api/snapshot";

export const startApi = () => {
  const endpoints = process.env.NETWORK
    ? ENDPOINTS.filter(({ name }) => name === process.env.NETWORK)
    : ENDPOINTS;

  const api = new MetaplexApiDataSource(endpoints);

  if (process.env.SNAPSHOT) {
    const dir = [":tmp", "1", "true"].includes(process.env.SNAPSHOT)
      ? undefined
      : process.env.SNAPSHOT;
    snapshot(api, dir).catch((err) => {
      console.log("❌ Snapshot error", err);
    });
  }

  return api;
};

export const warmUp = async (api: MetaplexApiDataSource) => {
  if (!process.env.WARM_UP_DISABLE) {
    console.log("🌋 Start warm up data");
    const start = performance.now();
    await api.preload();
    const end = performance.now();
    console.log(`🌋 Finish warm up data ${((end - start) / 1000).toFixed(0)}s`);
  }
};
