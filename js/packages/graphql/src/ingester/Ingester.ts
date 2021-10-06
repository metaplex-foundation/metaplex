import { extendBorsh } from "common";
import { WriterConstructor } from "ingester";
import { ENDPOINTS } from "./constants";
import { Loader } from "./Loader";
import { EndpointsMap } from "./types";

extendBorsh(); // it's need for proper work of decoding

const getEndpoints = (endpoints: EndpointsMap, filter?: string) => {
  return filter
    ? endpoints.filter(({ name }) => name.startsWith(filter))
    : endpoints;
};

export class Ingester {
  private entries: Loader[] = [];
  private readonly endpoints = getEndpoints(ENDPOINTS, process.env.NETWORK);

  constructor(private Writer: WriterConstructor) {}

  async init() {
    const { Writer, endpoints } = this;

    this.entries = await Promise.all(
      endpoints.map(async ({ name, endpoint }) => {
        const writer = await Writer.build(name);
        return new Loader(name, endpoint, writer);
      })
    );
  }

  async load() {
    await this.init();

    for (const entry of this.entries) {
      await entry.load();
    }
  }
}
