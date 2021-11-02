import fs from "fs";
import util from "util";
import path from "path";
import { tmpdir } from "os";
import mkdirp from "mkdirp";
import { Connection } from "@solana/web3.js";
import logger from "../logger";
import { Loader } from "./Loader";

const writeFileAsync = util.promisify(fs.writeFile);
const readFileAsync = util.promisify(fs.readFile);

export function wrapLoaderConnection(loader: Loader) {
  const snapshotPath = process.env.SNAPSHOT;
  if (snapshotPath) {
    const dir = [":tmp", "1", "true"].includes(snapshotPath)
      ? tmpdir()
      : snapshotPath;

    logger.info(`📖 Start read/write from/to snapshot`);

    snapshot(loader.connection, loader.networkName, dir);
  }
}

export function snapshot(
  connection: Connection,
  network: string,
  dir = tmpdir()
) {
  const readExistedSnapshot = async (name: string, args: any[]) => {
    await mkdirp(dir);

    if (name === "getProgramAccounts" && Array.isArray(args)) {
      const filename = `${network}-${name}-${args[0]}.json`;
      const filepath = path.join(dir, filename);
      try {
        const d = await readFileAsync(filepath);
        const json = JSON.parse(d.toString());
        logger.info(`📖 Read from cache ${filepath}`);
        return json;
      } catch (_) {
        logger.info("📖 Read from network", name, args);
      }
    }
  };
  const writeToSnapshot = async (resp: any, name: string, args: any[]) => {
    if (name === "getProgramAccounts" && Array.isArray(args)) {
      const filename = `${network}-${name}-${args[0]}.json`;
      const filepath = path.join(dir, filename);
      const data = JSON.stringify(resp);
      await writeFileAsync(filepath, data);
      logger.info(`✍  Write: ${filepath}`);
    }
  };

  setupFetch(connection, readExistedSnapshot, writeToSnapshot);
}

const setupFetch = (
  connection: Connection,
  preload?: (...args: any[]) => Promise<any>,
  postload?: (response: any, ...args: any[]) => void
) => {
  const conn = connection as any;
  const _rpcRequest = conn._rpcRequest.bind(connection);
  conn._rpcRequest = async function (...args: any[]) {
    try {
      let data: any = await preload?.(...args);
      if (data === undefined) {
        data = await _rpcRequest(...args);
        postload?.(data, ...args);
      }
      return data;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  };
};
