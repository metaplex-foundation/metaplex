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

export function updateCandyMachineList(candyAddress: string, env: string) {
  const fp = `${CACHE_PATH}/${env}_candyMachineList.json`
  if (!fs.existsSync(fp)){
      let cList = {
          candyList: [
              candyAddress
          ]
      }
      fs.writeFileSync(fp, JSON.stringify(cList));
  
  } else {
      let dataJSON = fs.readFileSync(fp, "utf-8");
      let data = JSON.parse(dataJSON);
      data.candyList.unshift(candyAddress);
      fs.writeFileSync(fp, JSON.stringify(data));
  }
}
export function getCandyMachineList(env: string) {
  const fp = `${CACHE_PATH}/${env}_candyMachineList.json`;
  let dataJSON = fs.readFileSync(fp, "utf-8");
  let data = JSON.parse(dataJSON);
  return data;
}  
