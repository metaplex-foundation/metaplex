import { ReadAdapter } from "reader";
import { getEndpoints } from "utils/getEndpoints";
import { MongoReader } from "./MongoReader";

export class MongoAdapter implements ReadAdapter {
  private readonly readers: MongoReader[] = [];

  constructor() {}

  public async init() {
    const endpoints = getEndpoints();
    for (const endpoint of endpoints) {
      endpoint.name;
      const reader = new MongoReader(endpoint.name, endpoint.endpoint);
      await reader.init();
      this.readers.push(reader);
    }
  }

  getReader(network: string) {
    const reader = this.readers.find(
      (loader) => loader.networkName === network
    );
    if (!reader) return null;
    return reader;
  }
}
