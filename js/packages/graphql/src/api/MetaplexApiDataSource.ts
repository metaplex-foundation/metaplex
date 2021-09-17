import { DataSource, DataSourceConfig } from "apollo-datasource";
import { ConnectionConfig } from "./ConnectionConfig";
import { MetaplexApi } from "./MetaplexApi";
import { ENDPOINTS } from "./endpoints";

export interface IBaseContext {
  network: string | undefined;
  api: MetaplexApi;
}

export class MetaplexApiDataSource<
  TContext extends IBaseContext = {
    network: string | undefined;
    api: MetaplexApi;
  }
> extends DataSource<TContext> {
  constructor(private endpoints = ENDPOINTS) {
    super();
  }

  private readonly flowControl = MetaplexApiDataSource.initFlowControl(
    this.endpoints.length
  );

  static initFlowControl(size: number) {
    const len = size - 1;
    const promises = new Array<Promise<void>>(len);
    const resolvers = new Array<() => void>(len);
    for (let i = 0; i < len; i++) {
      promises[i] = new Promise((resolve) => (resolvers[i] = resolve));
    }
    const result = new Array<{ promise: Promise<void>; finish: () => void }>(
      size
    );
    for (let i = 0; i < size; i++) {
      const finish = i + 1 === size ? () => {} : resolvers[i];
      const promise = i ? promises[i - 1] : Promise.resolve();
      result[i] = { promise, finish };
    }
    return result;
  }

  readonly ENTRIES = this.endpoints
    .map(
      ({ name, endpoint }, index) =>
        new ConnectionConfig(name, endpoint, this.flowControl[index])
    )
    .map((config) => new MetaplexApi(config));

  // preload all data endpoints
  preload() {
    return Promise.all(this.ENTRIES.map((entry) => entry.state));
  }

  initContext(context: TContext) {
    const entry =
      this.ENTRIES.find((entry) => entry.config.name === context.network) ??
      this.ENTRIES[0];
    context.api = entry;
  }

  // implementation for DataSource of apollo-datasource
  async initialize({ context }: DataSourceConfig<TContext>) {
    this.initContext(context);
  }
}
