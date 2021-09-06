import { clusterApiUrl } from '@solana/web3.js';
import { DataSource, DataSourceConfig } from 'apollo-datasource';
import { ConnectionConfig } from './ConnectionConfig';
import { MetaplexApi } from './MetaplexApi';

// XXX: re-use list from `contexts/connection` ?
const ENDPOINTS = [
  {
    name: 'mainnet-beta',
    endpoint: 'https://api.metaplex.solana.com/',
  },
  {
    name: 'testnet',
    endpoint: clusterApiUrl('testnet'),
  },
  {
    name: 'devnet',
    endpoint: clusterApiUrl('devnet'),
  },
];

export class MetaplexApiDataSource<
  TContext extends { network: string | undefined; api: MetaplexApi } = {
    network: string | undefined;
    api: MetaplexApi;
  },
> extends DataSource<TContext> {
  private readonly flowControl = MetaplexApiDataSource.initFlowControl(
    ENDPOINTS.length,
  );

  static initFlowControl(size: number) {
    const len = size - 1;
    const promises = new Array<Promise<void>>(len);
    const resolvers = new Array<() => void>(len);
    for (let i = 0; i < len; i++) {
      promises[i] = new Promise(resolve => (resolvers[i] = resolve));
    }
    const result = new Array<{ promise: Promise<void>; finish: () => void }>(
      size,
    );
    for (let i = 0; i < size; i++) {
      const finish = i + 1 === size ? () => {} : resolvers[i];
      const promise = i ? promises[i - 1] : Promise.resolve();
      result[i] = { promise, finish };
    }
    return result;
  }

  readonly ENTRIES = ENDPOINTS.map(
    ({ name, endpoint }, index) =>
      new ConnectionConfig(name, endpoint, this.flowControl[index]),
  ).map(config => new MetaplexApi(config));

  // preload all data endpoints
  preload() {
    return Promise.all(this.ENTRIES.map(entry => entry.state));
  }

  // implementation for DataSource of apollo-datasource
  async initialize(config: DataSourceConfig<TContext>) {
    const entry =
      this.ENTRIES.find(
        entry => entry.config.name === config.context.network,
      ) ?? this.ENTRIES[0];
    config.context.api = entry;
  }
}
