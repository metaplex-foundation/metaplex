import { IDataAdapter } from '../adapters/IDataAdapter';
import { EndpointsMap, IWriter } from '../ingester';
import { IReader } from '../reader';
import { Loader } from './Loader';
import { wrapLoaderConnection } from './snapshot';

export class Ingester<T extends IWriter = IWriter> {
  private readonly entries: Loader<T>[] = [];

  constructor(
    private readonly adapter: IDataAdapter<T, IReader>,
    private readonly endpoints: EndpointsMap,
  ) {}

  async init() {
    const { endpoints, entries } = this;
    if (entries.length) {
      return this.entries;
    }

    const list = await Promise.all(
      endpoints.map(async ({ name }) => {
        await this.adapter.init(name);
        const loader = new Loader(name, this.adapter);
        wrapLoaderConnection(loader);
        return loader;
      }),
    );

    entries.push(...list);
    return entries;
  }

  async load() {
    await this.init();
    for (const entry of this.entries) {
      await entry.load();
    }
  }
}
