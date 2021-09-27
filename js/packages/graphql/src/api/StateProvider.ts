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

const bindToState =
  (process: ProcessAccountsFunc, api: IMetaplexApiWrite) =>
  (account: PublicKeyStringAndAccount<Buffer>) => {
    process(account, (prop, key, value) => {
      api.persist(prop, key, value);
    });
  };

const bindToStateAndPubsub =
  (process: ProcessAccountsFunc, api: IMetaplexApiWrite, pubsub: PubSub) =>
  (account: PublicKeyStringAndAccount<Buffer>) => {
    process(account, (prop, key, value) => {
      api.persist(prop, key, value);
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
  private readonly api: IMetaplexApiWrite = {
    persist: (prop: TPropNames, key: string, value: ParsedAccount<any>) => {
      if (prop === "metadataByMint") {
        this.metadataByMint.set(key, value);
      }
      return this.$api.persist(prop, key, value);
    },
    persistBatch: (batch: [TPropNames, string, ParsedAccount<any>][]) => {
      batch.forEach(([prop, key, value]) => {
        if (prop === "metadataByMint") {
          this.metadataByMint.set(key, value);
        }
      });
      return this.$api.persistBatch(batch);
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
    await metadata.info.init();
    const masterEditionKey = metadata.info?.masterEdition;
    if (masterEditionKey) {
      api.persist("metadataByMasterEdition", masterEditionKey, metadata);
    }
    api.persist("metadataByMint", key, metadata);
    api.persist("metadata", "", metadata);
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

    const loading = this.programs.map((program) => {
      this.subscribeOnChange(program);
      return this.loadProgramAccounts(program);
    });

    const loadedAccounts = await Promise.all(loading);
    logger.info(`⏱  ${this.name} - data loaded and start processing data`);

    const decoding = loadedAccounts.map(async (accounts, index) => {
      const program = this.programs[index];
      await createPipelineExecutor(accounts.values(), program.process, {
        jobsCount: 2,
        name: `⛏  ${this.name} - data`,
      });
    });
    await Promise.all(decoding);
    logger.info(`⏱  ${this.name} - start processing metadata`);

    // processing metadata
    await createPipelineExecutor(
      this.metadataByMint.values(),
      async (metadata) => {
        await StateProvider.metadataByMintUpdater(metadata, this.api);
      },
      {
        jobsCount: 3,
        name: `⛏  ${this.name} - metadata`,
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
