import { WriterAdapter, WriterConstructor } from "ingester";
import { getEndpoints } from "../utils/getEndpoints";
import { Loader } from "./Loader";

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
          return new Loader(name, endpoint, writer);
        })
      ))
    );

    return entries;
  }

  async load() {
    this.init();
    for (const entry of this.entries) {
      await entry.load();
    }
  }
}
