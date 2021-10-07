import { Ingester } from "../../ingester";
import { ReadAdapter } from "../../reader";
import { MemoryReader } from "./MemoryReader";
import { MemoryWriter } from "./MemoryWriter";

export class MemoryAdapter extends ReadAdapter {
  readonly readers: MemoryReader[] = [];

  constructor(private ingester: Ingester<MemoryWriter>) {
    super();
  }

  async init() {
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
}
