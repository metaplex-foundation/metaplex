import { WriterAdapter, WriterConstructor } from "../ingester";
import { getEndpoints } from "../utils/getEndpoints";
import { Loader } from "./Loader";
import { wrapLoaderConnection } from "./snapshot";

export class Ingester<T extends WriterAdapter = WriterAdapter> {
  private readonly entries: Loader<T>[] = [];
  private readonly endpoints = getEndpoints();

  constructor(private Writer: WriterConstructor<T>) {}

  async init() {
    const { Writer, endpoints, entries } = this;
    if (entries.length) {
      return this.entries;
    }

    entries.push(
      ...(await Promise.all(
        endpoints.map(async ({ name, endpoint }) => {
          const writer = new Writer(name);
          await writer.init();
          const loader = new Loader(name, endpoint, writer);
          wrapLoaderConnection(loader);
          return loader;
        })
      ))
    );

    return entries;
  }

  async load() {
    await this.init();
    for (const entry of this.entries) {
      await entry.load();
    }
  }
}
