import fs from "fs";
import util from "util";
import path from "path";
import { tmpdir } from "os";
import mkdirp from "mkdirp";
import { Connection } from "@solana/web3.js";
import { MetaplexApiDataSource } from ".";
import logger from "../logger";
const writeFileAsync = util.promisify(fs.writeFile);
const readFileAsync = util.promisify(fs.readFile);

export async function snapshot(api: MetaplexApiDataSource, dir = tmpdir()) {
  let checkDir = false;
  logger.info(`📖 Start read/write from/to snapshot`);
  api.ENTRIES.map((entry) => {
    setupFetch(
      entry.provider.connection,
      async (name: string, args: any[]) => {
        if (!checkDir) {
          await mkdirp(dir);
          checkDir = true;
        }

        if (name === "getProgramAccounts" && Array.isArray(args)) {
          const filename = `${entry.provider.name}-${name}-${args[0]}.json`;
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
      },
      async (resp, name: string, args: any[]) => {
        if (name === "getProgramAccounts" && Array.isArray(args)) {
          const filename = `${entry.provider.name}-${name}-${args[0]}.json`;
          const filepath = path.join(dir, filename);
          const data = JSON.stringify(resp);
          await writeFileAsync(filepath, data);
          logger.info(`✍  Write: ${filepath}`);
        }
      }
    );
  });
}

export const setupFetch = (
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
