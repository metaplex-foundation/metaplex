import { IDataAdapter } from '../IDataAdapter';
import { MongoReader } from './MongoReader';
import { MongoWriter } from './MongoWriter';
import { createConnection } from '../../utils/createConnection';
import { Connection } from '@solana/web3.js';

import { createOrm } from './createOrm';
import { Db } from 'mongodb';
import { getEndpoints } from '../../utils/getEndpoints';
import { EndpointsMap } from '../../ingester';

export class MongoAdapter implements IDataAdapter<MongoWriter, MongoReader> {
  private connectionString: string;

  private dbName = (name: string) => `metaplex-${name}`;

  public readonly endpoints: EndpointsMap;
  constructor(options?: {
    endpoints?: EndpointsMap;
    connectionString?: string;
    dbName?: (val: string) => string;
  }) {
    this.endpoints = options?.endpoints ?? getEndpoints();
    this.connectionString =
      options?.connectionString ??
      (process.env.MONGO_DB ||
        'mongodb://127.0.0.1:27017/?readPreference=primary&directConnection=true&ssl=false');

    if (options?.dbName) {
      this.dbName = options.dbName;
    }
  }

  private readonly container = new Map<
    string,
    readonly [MongoReader, MongoWriter, Connection]
  >();

  private getBox(
    network: string,
  ): readonly [MongoReader, MongoWriter, Connection] | undefined {
    if (this.container.has(network)) {
      return this.container.get(network)!;
    }
    const entry = this.endpoints.find(p => p.name === network);
    if (!entry) {
      return undefined;
    }

    const connection = createConnection(entry.endpoint, 'recent');

    let db: Db | undefined;
    const initOrm = async () => {
      if (db) {
        return db;
      }
      const orm = await createOrm(this.connectionString, {
        dbName: this.dbName(network),
      });
      db = orm.db;
      return db;
    };

    const writer = new MongoWriter(network, initOrm);
    const reader = new MongoReader(network, {
      connection,
      initOrm,
    });
    const box = [reader, writer, connection] as const;
    this.container.set(network, box);
    return box;
  }

  async init(network?: string) {
    if (network) {
      const box = this.getBox(network);
      if (!box) {
        throw new Error(`Can't find network: ${network}`);
      }
      const [reader, writer] = box;
      await Promise.all([reader.init(), writer.init()]);
    } else {
      await Promise.all(this.endpoints.map(({ name }) => this.init(name)));
    }
  }

  initSubscription(network?: string): boolean[] {
    if (network) {
      return [this.getReader(network)?.initSubscription() ?? false];
    } else {
      return this.endpoints.map(({ name }) => this.initSubscription(name)[0]);
    }
  }

  getReader(network: string): MongoReader | undefined {
    return this.getBox(network)?.[0];
  }

  getWriter(network: string): MongoWriter | undefined {
    return this.getBox(network)?.[1];
  }

  getConnection(network: string): Connection | undefined {
    return this.getBox(network)?.[2];
  }
}
