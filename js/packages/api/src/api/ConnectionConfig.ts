import {
  Commitment,
  Connection,
  GetProgramAccountsConfig,
} from '@solana/web3.js';
import after from 'lodash/after';
import { getEmptyMetaState } from '@oyster/common/dist/lib/contexts/meta/getEmptyMetaState';
import {
  MetaState,
  ProcessAccountsFunc,
} from '@oyster/common/dist/lib/contexts/meta/types';

import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  pubkeyToString,
  PublicKeyStringAndAccount,
  toPublicKey,
  VAULT_ID,
} from '@oyster/common/dist/lib/utils/ids';

import { processAuctions } from '@oyster/common/dist/lib/contexts/meta/processAuctions';
import { processMetaData } from '@oyster/common/dist/lib/contexts/meta/processMetaData';
import { processMetaplexAccounts } from '@oyster/common/dist/lib/contexts/meta/processMetaplexAccounts';
import { processVaultData } from '@oyster/common/dist/lib/contexts/meta/processVaultData';

import { ParsedAccount } from '@oyster/common/dist/lib/contexts/accounts/types';
import {
  AccountAndPubkey,
  getProgramAccounts,
} from '@oyster/common/dist/lib/utils/web3';
import { Metadata } from '@oyster/common/dist/lib/actions/metadata';
import EventEmitter from 'eventemitter3';
import { PubSub, withFilter } from 'graphql-subscriptions';
export declare type FilterFn<T = any> = (
  rootValue?: T,
  args?: any,
  context?: any,
  info?: any,
) => boolean | Promise<boolean>;

type MessageData = [PublicKeyStringAndAccount<Buffer>, IConfig];
type Emitter = EventEmitter<'data'>;
interface IConfig {
  key: string;
  fn: ProcessAccountsFunc;
  configOrCommitment?: GetProgramAccountsConfig | Commitment;
}

export interface IEvent {
  prop: keyof MetaState;
  key: string;
  value: ParsedAccount<any>;
}

interface IConfigWithData extends IConfig {
  data: AccountAndPubkey[];
  subscrtionId: number | undefined;
}

export class ConnectionConfig {
  static setter(
    state: MetaState,
    prop: keyof MetaState,
    key: string,
    value: ParsedAccount<any>,
  ) {
    if (prop === 'store') {
      state[prop] = value;
    } else if (prop !== 'metadata') {
      state[prop][key] = value;
    }
    return state;
  }

  static async metadataByMintUpdater(
    metadata: ParsedAccount<Metadata>,
    state: MetaState,
  ) {
    const key = metadata.info.mint;
    await metadata.info.init();
    const masterEditionKey = metadata.info?.masterEdition;
    if (masterEditionKey) {
      state.metadataByMasterEdition[masterEditionKey] = metadata;
    }
    state.metadataByMint[key] = metadata;
    state.metadata.push(metadata);
  }

  private state?: MetaState;
  readonly connection: Connection;
  constructor(
    public readonly name: string,
    endpoint: string,
    private flowControl = { promise: Promise.resolve(), finish: () => {} },
  ) {
    this.connection = new Connection(endpoint, 'recent');
  }
  private defer: Promise<void> | undefined;

  private readonly pubsub = new PubSub();

  setupFetch(
    preload?: (...args: any[]) => Promise<any>,
    postload?: (response: any, ...args: any[]) => void,
  ) {
    const conn = this.connection as any;
    const _rpcRequest = conn._rpcRequest.bind(this.connection);
    conn._rpcRequest = async function (...args: any[]) {
      try {
        let data: any = await preload?.(...args);
        if (data === undefined) {
          data = await _rpcRequest(...args);
          postload?.(data, ...args);
        }
        return data;
      } catch (err) {
        console.error(err);
        throw err;
      }
    };
  }

  subscribeIterator(prop: keyof MetaState, key?: string | FilterFn<IEvent>) {
    const iter = () => this.pubsub.asyncIterator<IEvent>(prop);
    if (key !== undefined) {
      if (typeof key === 'string') {
        return withFilter(iter, (payload: IEvent) => {
          return payload.key === key;
        });
      } else {
        return withFilter(iter, key);
      }
    }
    return iter;
  }
  /**
   * send event to Subscribers
   */
  private sendEvent(
    prop: keyof MetaState,
    key: string,
    value: ParsedAccount<any>,
  ) {
    const event: IEvent = {
      prop,
      key,
      value,
    };
    this.pubsub.publish(prop, event);
  }

  load() {
    if (this.defer) {
      return this.defer.then(() => this.state!);
    }
    const emitter: Emitter = new EventEmitter();
    const container: Array<{
      prop: keyof MetaState;
      key: string;
      value: ParsedAccount<any>;
    }> = [];
    emitter.on('data', ([data, config]: MessageData) => {
      config.fn(
        data,
        (prop, key, value) => {
          if (this.state) {
            // Apply to current state
            ConnectionConfig.setter(this.state, prop, key, value);
            // We send events only after state would be formed
            this.sendEvent(prop, key, value);
          } else {
            container.push({ prop, key, value });
          }
        },
        true,
      );
    });

    const defer = (this.defer = this.flowControl.promise
      .then(() => this.loadData(emitter))
      .then(state => {
        console.log(`🏝️  ${this.name} meta loaded`);
        container.forEach(({ prop, key, value }) =>
          ConnectionConfig.setter(state, prop, key, value),
        );
        this.state = state; // maybe sent to anoter state
        this.flowControl.finish();
      })
      .catch(e => {
        // XXX: try to reconnect
        console.error(e);
        throw e;
      }));
    return defer.then(() => this.state!);
  }

  runTestSubscribtionsEvents(prop: keyof MetaState, delay = 1000) {
    const id = setInterval(() => {
      if (prop === 'metadata') {
        const data = this.state?.[prop];
        if (!data) {
          return;
        }
        const index = Math.floor(Math.random() * data.length);
        const item = data[index];
        this.sendEvent(prop, `${index}`, item);
      } else {
        const data = this.state?.[prop];
        if (!data) {
          return;
        }
        const keys = Object.keys(data);
        const index = Math.floor(Math.random() * keys.length);
        const key = keys[index];
        const item = (data as any)[key];
        this.sendEvent(prop, key, item);
      }
    }, delay);
    return () => clearInterval(id);
  }

  static readonly CONFIG: IConfig[] = [
    {
      key: VAULT_ID,
      fn: processVaultData,
    },
    {
      key: AUCTION_ID,
      fn: processAuctions,
    },
    {
      key: METAPLEX_ID,
      fn: processMetaplexAccounts,
    },
    {
      key: METADATA_PROGRAM_ID, // ??? IS_BIG_STORE??? see loadAccounts
      fn: processMetaData,
    },
  ];

  private async loadData(emitter?: Emitter) {
    console.log(`⏱  ${this.name} - start loading data`);
    const preloading = ConnectionConfig.CONFIG.map(config =>
      this.loadDataByConfig(config, emitter),
    );
    const processingData = await Promise.all(preloading);
    console.log(`⏱  ${this.name} - data loaded and start processing data`);
    const state: MetaState = getEmptyMetaState();

    const arr = processingData.map(async config => {
      await createPipelineExecutor(
        config.data.values(),
        async item => {
          config.fn(
            item,
            (prop, key, value) =>
              ConnectionConfig.setter(state, prop, key, value),
            true,
          );
        },
        {
          delay: 0,
          jobsCount: 2,
          sequence: 10,
          completeGroup: 10000,
          name: `⛏  ${this.name} - data`,
        },
      );
    });
    await Promise.all(arr);

    console.log(`⏱  ${this.name} - start processing metadata`);
    // processing metadata
    await createPipelineExecutor(
      iterateObject(state.metadataByMint),
      async metadata => {
        await ConnectionConfig.metadataByMintUpdater(metadata, state);
      },
      {
        delay: 0,
        jobsCount: 3,
        name: `⛏  ${this.name} - metadata`,
        sequence: 10,
        completeGroup: 10000,
      },
    );
    return state;
  }

  private async loadDataByConfig(
    config: IConfig,
    emitter?: Emitter,
  ): Promise<IConfigWithData> {
    const subscrtionId = !emitter
      ? undefined
      : this.connection.onProgramAccountChange(
          toPublicKey(config.key),
          block => {
            const item: PublicKeyStringAndAccount<Buffer> = {
              pubkey: pubkeyToString(block.accountId),
              account: block.accountInfo,
            };
            emitter?.emit('data', [item, config]);
          },
        );
    console.log(`🤞 ${this.name} - loading program accounts ${config.key}`);
    const data = await getProgramAccounts(this.connection, config.key).then(
      data => {
        console.log(`🍀 ${this.name} - loaded ${config.key}`);
        return data;
      },
      err => {
        console.error(`🐛 ${this.name} - failed loaded ${config.key}`);
        throw err;
      },
    );
    return {
      ...config,
      subscrtionId,
      data,
    };
  }
}

async function createPipelineExecutor<T>(
  data: IterableIterator<T>,
  executor: (d: T, index: number, cb?: (err?: Error) => void) => void,
  {
    delay,
    jobsCount,
    name,
    sequence = 0,
    completeGroup = 100,
  }: {
    delay: number;
    jobsCount: number;
    name?: string;
    sequence?: number;
    completeGroup?: number;
  },
) {
  let index = 0;
  let complete = 0;

  function execute<T>(iter: IteratorResult<T, any>) {
    index++;
    const numIndex = index;
    executor(iter.value, numIndex);
    complete++;
    if (name && complete % completeGroup === 0) {
      console.log(`${name}: ${complete} tasks were processed`);
    }
  }

  async function next() {
    const iter = data.next();
    if (iter.done) {
      return;
    }
    if (sequence <= 1) {
      execute(iter);
    } else {
      const exec = after(sequence, () => execute(iter));
      for (let i = 0; i < sequence; i++) {
        exec();
      }
    }
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    } else {
      await Promise.resolve();
    }
    await next();
  }
  const result = new Array<Promise<void>>(jobsCount);
  for (let i = 0; i < jobsCount; i++) {
    result[i] = next();
  }
  await Promise.all(result);
}

function iterateObject<T>(obj: Record<string, T>): IterableIterator<T> {
  function* gen() {
    for (const key in obj) {
      yield obj[key];
    }
  }
  return gen();
}
