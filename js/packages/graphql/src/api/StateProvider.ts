import { Connection } from "@solana/web3.js";
import {
  ProcessAccountsFunc,
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  pubkeyToString,
  PublicKeyStringAndAccount,
  toPublicKey,
  VAULT_ID,
  processAuctions,
  processMetaData,
  processMetaplexAccounts,
  processVaultData,
  ParsedAccount,
  getProgramAccounts,
  Metadata,
  MetaState,
} from "../common";
import queue from "queue";
import { PubSub, withFilter } from "graphql-subscriptions";
import { createPipelineExecutor } from "../utils/createPipelineExecutor";
import { createConnection } from "./createConnection";
import logger from "../logger";
import { IMetaplexApiWrite, TPropNames } from "./IMetaplexApi";

export declare type FilterFn<T = any> = (
  rootValue?: T,
  args?: any,
  context?: any,
  info?: any
) => boolean | Promise<boolean>;

interface IProgramConfig {
  pubkey: string;
  process: ReturnType<typeof bindToState>;
  processAndPublish: ReturnType<typeof bindToStateAndPubsub>;
}

export interface IEvent {
  prop: TPropNames;
  key: string;
}

function init<T>({ account }: PublicKeyStringAndAccount<T>) {
  const ptr = account as { init?: () => Promise<void> };
  if (ptr.init && ptr.init instanceof Function) {
    return ptr.init();
  }
}

const bindToState =
  (process: ProcessAccountsFunc, api: IMetaplexApiWrite) =>
  (account: PublicKeyStringAndAccount<Buffer>) => {
    return new Promise<void>((resolve, reject) => {
      let start = false;
      const ptr = init(account);
      (ptr || Promise.resolve()).then(() => {
        process(account, (prop, key, value) => {
          start = true;
          api.persist(prop, key, value).then(
            () => resolve(),
            (err) => {
              logger.error(err);
              reject(err);
            }
          );
        });
        if (!start) {
          resolve();
        }
      });
    });
  };

const bindToStateAndPubsub =
  (process: ProcessAccountsFunc, api: IMetaplexApiWrite, pubsub: PubSub) =>
  (account: PublicKeyStringAndAccount<Buffer>) => {
    return process(account, async (prop, key, value) => {
      const ptr = init(account);
      if (ptr) {
        await ptr;
      }
      api.persist(prop, key, value).catch((err) => logger.error(err));
      logger.info(`⚡ event - ${prop}:${key}`);
      pubsub.publish(prop, { prop, key });
    });
  };

export class StateProvider {
  readonly connection: Connection;
  private defer: Promise<void> | undefined;
  private readonly changesQueue = queue({ autostart: false, concurrency: 1 });
  private readonly pubsub = new PubSub();
  private readonly $api: IMetaplexApiWrite;
  private metadataByMint: Map<string, ParsedAccount<Metadata>> = new Map();

  private ids: Map<string, Promise<void>> = new Map();
  private cache: Partial<
    Record<keyof MetaState, Map<string, ParsedAccount<any>>>
  > = {};

  private readonly api: IMetaplexApiWrite = {
    flush: async () => {
      const cache = this.cache;
      this.cache = {};
      const defers = Object.keys(cache).map((key) => {
        const prop = key as keyof MetaState;
        const ptr = cache[prop]!;
        const docs = Array.from(ptr.values());
        const clazz = docs[0].info.constructor;
        return this.$api.persistBatch(clazz, docs, prop).catch(() => {});
      });
      await Promise.all(defers);
      await this.$api.flush();
    },
    persistBatch: async (a, b, c) => {
      return this.$api.persistBatch(a, b, c);
    },
    persist: async (
      prop: TPropNames,
      key: string,
      value: ParsedAccount<any>
    ) => {
      const keySave = `${prop}-${key}`;
      if (this.ids.has(keySave)) {
        await this.ids.get(keySave);
        this.api.persist(prop, key, value);
        return;
      }
      if (prop === "metadataByMint") {
        this.metadataByMint.set(key, value);
      }
      const ptr = this.cache[prop] || (this.cache[prop] = new Map());
      ptr.set(key, value);
    },
  };

  readonly programs: IProgramConfig[] = [
    {
      pubkey: VAULT_ID,
      process: bindToState(processVaultData, this.api),
      processAndPublish: bindToStateAndPubsub(
        processVaultData,
        this.api,
        this.pubsub
      ),
    },

    {
      pubkey: AUCTION_ID,
      process: bindToState(processAuctions, this.api),
      processAndPublish: bindToStateAndPubsub(
        processAuctions,
        this.api,
        this.pubsub
      ),
    },
    {
      pubkey: METAPLEX_ID,
      process: bindToState(processMetaplexAccounts, this.api),
      processAndPublish: bindToStateAndPubsub(
        processMetaplexAccounts,
        this.api,
        this.pubsub
      ),
    },
    {
      pubkey: METADATA_PROGRAM_ID,
      process: bindToState(processMetaData, this.api),
      processAndPublish: bindToStateAndPubsub(
        processMetaData,
        this.api,
        this.pubsub
      ),
    },
  ];

  static async metadataByMintUpdater(
    metadata: ParsedAccount<Metadata>,
    api: IMetaplexApiWrite
  ) {
    const key = metadata.info.mint;
    const masterEditionKey = metadata.info?.masterEdition;
    const ops: Promise<void>[] = [];

    if (masterEditionKey) {
      ops[ops.length] = api
        .persist("metadataByMasterEdition", masterEditionKey, metadata)
        .catch((err) => {
          logger.error(err);
        });
    }
    ops[ops.length] = api
      .persist("metadataByMint", key, metadata)
      .catch((err) => {
        logger.error(err);
      });
    ops[ops.length] = api.persist("metadata", "", metadata).catch((err) => {
      logger.error(err);
    });
    await Promise.all(ops);
  }

  constructor(
    public readonly name: string,
    endpoint: string,
    initApi: (provider: StateProvider) => IMetaplexApiWrite,
    private flowControl = { promise: Promise.resolve(), finish: () => {} }
  ) {
    this.$api = initApi(this);
    this.connection = createConnection(endpoint, "recent");
  }

  subscribeIterator(prop: TPropNames, key?: string | FilterFn<IEvent>) {
    const iter = () => this.pubsub.asyncIterator<IEvent>(prop);
    if (key !== undefined) {
      if (typeof key === "string") {
        return withFilter(iter, (payload: IEvent) => {
          return payload.key === key;
        });
      } else {
        return withFilter(iter, key);
      }
    }
    return iter;
  }

  async load() {
    if (!this.defer) {
      this.defer = this.createDefer();
    }
    await this.defer;
  }

  private async createDefer() {
    await this.flowControl.promise;
    try {
      await this.loadAndProcessData();
      logger.info(`🏝️  ${this.name} meta loaded`);
      // process emitted messages
      this.changesQueue.autostart = true;
      this.changesQueue.start();
      this.flowControl.finish();
    } catch (e) {
      // XXX: try to reconnect
      logger.error(e);
      throw e;
    }
  }

  private async loadAndProcessData() {
    logger.info(`⏱  ${this.name} - start loading data`);

    const loading = this.programs.map(async (program, index, list) => {
      this.subscribeOnChange(program);
      const accounts = await this.loadProgramAccounts(program);
      logger.info(
        `Need to processed ${accounts.length} tasks from ${program.pubkey}`
      );
      await createPipelineExecutor(accounts.values(), program.process, {
        jobsCount: 2,
        //name: `⛏  ${this.name}(${index + 1}-${list.length}) - data`,
        sequence: 1000,
        delay: () => this.api.flush(),
      });
      logger.info(`Processed ${index + 1} from ${list.length}`);
    });
    await Promise.all(loading);

    await this.api.flush();
    logger.info(`⏱  ${this.name} - start processing metadata`);

    // processing metadata

    await createPipelineExecutor(
      this.metadataByMint.values(),
      async (metadata) => {
        await StateProvider.metadataByMintUpdater(metadata, this.api);
      },
      {
        jobsCount: 1,
        name: `⛏  ${this.name} - metadata`,
        sequence: 500,
        delay: () => this.api.flush(),
      }
    );
  }

  private async loadProgramAccounts(program: IProgramConfig) {
    try {
      logger.info(
        `🤞 ${this.name} - loading program accounts ${program.pubkey}`
      );
      const accounts = await getProgramAccounts(
        this.connection,
        program.pubkey
      );
      logger.info(`🍀 ${this.name} - loaded ${program.pubkey}`);

      return accounts;
    } catch (e) {
      logger.error(`🐛 ${this.name} - failed loaded ${program.pubkey}`);
      throw e;
    }
  }

  private subscribeOnChange(program: IProgramConfig) {
    this.connection.onProgramAccountChange(
      toPublicKey(program.pubkey),
      (block) => {
        const account: PublicKeyStringAndAccount<Buffer> = {
          pubkey: pubkeyToString(block.accountId),
          account: {
            ...block.accountInfo,
            owner: pubkeyToString(block.accountInfo.owner),
          },
        };
        // We send events only after data processed
        const process = this.changesQueue.autostart
          ? program.processAndPublish
          : program.process;
        this.changesQueue.push((cb) => {
          process(account);
          cb?.();
        });
      }
    );
  }
}
