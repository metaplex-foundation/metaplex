import { Connection } from "@solana/web3.js";
import { Reader } from "reader";
import { MemoryWriter } from "./MemoryWriter";

export class MemoryReader extends Reader {
  constructor(
    public networkName: string,
    connection: Connection,
    private writer: MemoryWriter
  ) {
    super(connection);
  }

  async init() {
    this.writer.setPublishFn((prop, key) =>
      this.pubsub.publish(prop, { prop, key })
    );
  }
}
