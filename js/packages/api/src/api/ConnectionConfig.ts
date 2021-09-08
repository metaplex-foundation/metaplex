import {
  Commitment,
  Connection,
  GetProgramAccountsConfig,
} from '@solana/web3.js';
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

async function createPipelineExecutor<T>(
  data: IterableIterator<T>,
  executor: (d: T, index: number) => Promise<void>,
  {
    delay,
    jobsCount,
    name,
  }: { delay: number; jobsCount: number; name?: string },
) {
  let index = 0;
  let complete = 0;
  async function next() {
    const iter = data.next();
    if (iter.done) {
      return;
    }
    index++;
    await executor(iter.value, index);
    complete++;
    if (complete % 100 === 0) {
      console.log(`${name ? name + ': ' : ''}${complete} tasks was processes`);
    }
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
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

  private readonly subscribers = new Map<
    keyof MetaState,
    ((event: IEvent) => void)[]
  >();

  awaitChanges(prop: keyof MetaState): Promise<IEvent> {
    return new Promise<IEvent>(resolve => {
      const orignalData = this.subscribers.get(prop);
      const data = orignalData ?? [];
      data.push(resolve);
      if (!orignalData) {
        this.subscribers.set(prop, data);
      }
    });
  }
  /**
   * send event to Subscribers
   */
  private sendEvent(
    prop: keyof MetaState,
    key: string,
    value: ParsedAccount<any>,
  ) {
    console.log('event', prop, key, value);
    const subscribers = this.subscribers.get(prop);
    if (!subscribers?.length) {
      return;
    }
    const event: IEvent = {
      prop,
      key,
      value,
    };
    subscribers.forEach(send => send(event));
    // cleanup subscribers
    this.subscribers.set(prop, []);
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
            ConnectionConfig.setter(this.state, prop, key, value); // Apply to current state
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
    const preloading = ConnectionConfig.CONFIG.map(config =>
      this.loadDataByConfig(config, emitter),
    );
    const processingData = await Promise.all(preloading);

    const state: MetaState = getEmptyMetaState();

    // processing loading data, It may take a lot of time
    await createPipelineExecutor(
      processingData.values(),
      async config => {
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
          { delay: 0, jobsCount: 2, name: 'Data' },
        );
      },
      { delay: 0, jobsCount: 1 },
    );

    // processing metadata
    await createPipelineExecutor(
      iterateObject(state.metadataByMint),
      async metadata => {
        await ConnectionConfig.metadataByMintUpdater(metadata, state);
      },
      {
        delay: 0,
        jobsCount: 3,
        name: 'Metadata',
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
    const data = await getProgramAccounts(this.connection, config.key);
    return {
      ...config,
      subscrtionId,
      data,
    };
  }
}
