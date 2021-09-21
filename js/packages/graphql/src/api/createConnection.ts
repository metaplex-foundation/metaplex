import { Commitment, Connection, ConnectionConfig } from "@solana/web3.js";
import fetch from "cross-fetch";
import { parseChunked } from "@discoveryjs/json-ext";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// rewrite me if https://github.com/solana-labs/solana/pull/19821 or
// https://github.com/solana-labs/solana/pull/20063 will be merged or maybe not so hucky way

export function createConnection(
  endpoint: string,
  commitmentOrConfig?: Commitment | ConnectionConfig
): Connection {
  const connection = new Connection(endpoint, commitmentOrConfig);
  const client = (connection as any)._rpcClient;
  client.callServer = async (
    request: any,
    callback: (err?: any, data?: any) => void
  ) => {
    const options = {
      method: "POST",
      body: request,
      headers: Object.assign({
        "Content-Type": "application/json",
      }),
    };
    try {
      let too_many_requests_retries = 5;
      let res: Response;
      let waitTime = 500;
      for (;;) {
        res = await fetch(endpoint, options);

        if (res.status !== 429 /* Too many requests */) {
          break;
        }
        too_many_requests_retries -= 1;
        if (too_many_requests_retries === 0) {
          break;
        }
        console.log(
          `Server responded with ${res.status} ${res.statusText}.  Retrying after ${waitTime}ms delay...`
        );
        await sleep(waitTime);
        waitTime *= 2;
      }
      const json = await parseChunked(async function* load() {
        const buffer = await res.arrayBuffer();
        const step = 1e8; // 100mb
        let start = 0;
        let end = step;
        while (start < buffer.byteLength) {
          const chunk = buffer.slice(start, end);
          yield chunk as Buffer;
          start = end;
          end = start + step;
        }
      });

      if (!json) {
        throw new Error(`${res.status} ${res.statusText}: empty response`);
      }
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      callback(null, json);
    } catch (err) {
      callback(err);
    }
  };
  client._parseResponse = function (
    err: Error,
    responseObject: any,
    callback: (err?: Error, data?: any) => void
  ) {
    if (err) {
      callback(err);
      return;
    }
    return callback(undefined, responseObject);
  };

  return connection;
}
