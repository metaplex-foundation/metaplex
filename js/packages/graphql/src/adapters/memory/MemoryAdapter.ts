import { Ingester } from "../../ingester";
import { ReadAdapter } from "../../reader";
import { MemoryReader } from "./MemoryReader";
import { MemoryWriter } from "./MemoryWriter";

export class MemoryAdapter implements ReadAdapter {
  private readonly readers: MemoryReader[] = [];

  constructor(private ingester: Ingester<MemoryWriter>) {}

  public async init() {
    const loaders = await this.ingester.init();
    loaders.forEach((loader) => {
      const reader = new MemoryReader(
        loader.networkName,
        loader.connection,
        loader.writer
      );
      this.readers.push(reader);
    });
  }

  getReader(network: string) {
    const reader = this.readers.find(
      (loader) => loader.networkName === network
    );
    if (!reader) return null;

    return reader;
  }
}
