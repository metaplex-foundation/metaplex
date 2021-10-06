import { getEmptyState, MetaState, UpdateStateValueFunc } from "common";
import { WriterAdapter } from "../../ingester/";

// TODO: connect reader
// TODO: pubsub

export class MemoryWriter implements WriterAdapter {
  private state: MetaState = getEmptyState();

  public static async build(name: string) {
    return new this(name);
  }

  constructor(private name: string) {}

  public persist: UpdateStateValueFunc = async (prop, key, value) => {
    const a = this.state[prop] as Map<string, typeof value>;
    a.set(key, value);
  };

  async flush() {}
}
