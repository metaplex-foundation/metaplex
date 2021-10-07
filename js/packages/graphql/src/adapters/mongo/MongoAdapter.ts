import { ReadAdapter } from "../../reader";
import { getEndpoints } from "../../utils/getEndpoints";
import { MongoReader } from "./MongoReader";

export class MongoAdapter extends ReadAdapter {
  readonly readers: MongoReader[] = [];

  async init() {
    const endpoints = getEndpoints();
    for (const endpoint of endpoints) {
      const reader = new MongoReader(endpoint.name, endpoint.endpoint);
      await reader.init();
      this.readers.push(reader);
    }
  }
}
