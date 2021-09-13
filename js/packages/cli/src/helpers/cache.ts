import path from "path";
import { CACHE_PATH } from "./constants";
import fs from "fs";

export function cachePath(env: string, cacheName: string) {
  return path.join(CACHE_PATH, `${env}-${cacheName}`);
}

export function loadCache(cacheName: string, env: string) {
  const path = cachePath(env, cacheName);
  return fs.existsSync(path)
    ? JSON.parse(fs.readFileSync(path).toString())
    : undefined;
}

export function saveCache(cacheName: string, env: string, cacheContent) {
  fs.writeFileSync(cachePath(env, cacheName), JSON.stringify(cacheContent));
}
