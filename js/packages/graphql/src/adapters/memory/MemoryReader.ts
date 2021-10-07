import { Connection } from "@solana/web3.js";
import { Reader } from "../../reader";
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

  get state() {
    return this.writer.getState();
  }

  async storesCount() {
    return this.state.store.size;
  }

  async creatorsCount() {
    return this.state.creator.size;
  }

  async artworksCount() {
    return this.state.metadata.size;
  }

  async auctionsCount() {
    return this.state.auction.size;
  }

  async getStores() {
    const { store } = this.state;
    return Array.from(store.values());
  }
}
