import { Reader } from "./Reader";

export abstract class ReadAdapter {
  abstract readonly readers: Reader[];

  abstract init(): Promise<void>;

  getReader(network: string) {
    const reader = this.readers.find(
      (reader) => reader.networkName === network
    );
    if (!reader) return null;

    return reader;
  }
}
