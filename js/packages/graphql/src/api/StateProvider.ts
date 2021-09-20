import { Connection } from "@solana/web3.js";
import {
  MetaState,
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
  getEmptyState,
} from "../common";
import queue from "queue";
import { PubSub, withFilter } from "graphql-subscriptions";
import { createPipelineExecutor } from "../utils/createPipelineExecutor";

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
  prop: keyof MetaState;
  key: string;
}

const bindToState =
  (process: ProcessAccountsFunc, state: MetaState) =>
  (account: PublicKeyStringAndAccount<Buffer>) => {
    process(account, (prop, key, value) => {
      state[prop].set(key, value);
    });
  };

const bindToStateAndPubsub =
  (process: ProcessAccountsFunc, state: MetaState, pubsub: PubSub) =>
  (account: PublicKeyStringAndAccount<Buffer>) => {
    process(account, (prop, key, value) => {
      state[prop].set(key, value);
      console.log(`⚡ event - ${prop}:${key}`);
      pubsub.publish(prop, { prop, key });
    });
  };

export class StateProvider {
  private state: MetaState = getEmptyState();
  readonly connection: Connection;
  private defer: Promise<void> | undefined;
  private readonly changesQueue = queue({ autostart: false, concurrency: 1 });
  private readonly pubsub = new PubSub();

  readonly programs: IProgramConfig[] = [
    {
      pubkey: VAULT_ID,
      process: bindToState(processVaultData, this.state),
      processAndPublish: bindToStateAndPubsub(
        processVaultData,
        this.state,
        this.pubsub
      ),
    },
    {
      pubkey: AUCTION_ID,
      process: bindToState(processAuctions, this.state),
      processAndPublish: bindToStateAndPubsub(
        processAuctions,
        this.state,
        this.pubsub
      ),
    },
    {
      pubkey: METAPLEX_ID,
      process: bindToState(processMetaplexAccounts, this.state),
      processAndPublish: bindToStateAndPubsub(
        processMetaplexAccounts,
        this.state,
        this.pubsub
      ),
    },
    {
      pubkey: METADATA_PROGRAM_ID,
      process: bindToState(processMetaData, this.state),
      processAndPublish: bindToStateAndPubsub(
        processMetaData,
        this.state,
        this.pubsub
      ),
    },
  ];

  static async metadataByMintUpdater(
    metadata: ParsedAccount<Metadata>,
    state: MetaState
  ) {
    const key = metadata.info.mint;
    await metadata.info.init();
    const masterEditionKey = metadata.info?.masterEdition;
    if (masterEditionKey) {
      state.metadataByMasterEdition.set(masterEditionKey, metadata);
    }
    state.metadataByMint.set(key, metadata);
    state.metadata.push(metadata);
  }

  constructor(
    public readonly name: string,
    endpoint: string,
    private flowControl = { promise: Promise.resolve(), finish: () => {} }
  ) {
    this.connection = new Connection(endpoint, "recent");
  }

  subscribeIterator(prop: keyof MetaState, key?: string | FilterFn<IEvent>) {
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
    return this.state;
  }

  private async createDefer() {
    await this.flowControl.promise;
    try {
      await this.loadAndProcessData();
      console.log(`🏝️  ${this.name} meta loaded`);
      // process emitted messages
      this.changesQueue.autostart = true;
      this.changesQueue.start();
      this.flowControl.finish();
    } catch (e) {
      // XXX: try to reconnect
      console.error(e);
      throw e;
    }
  }

  private async loadAndProcessData() {
    console.log(`⏱  ${this.name} - start loading data`);

    const loading = this.programs.map((program) => {
      this.subscribeOnChange(program);
      return this.loadProgramAccounts(program);
    });

    const loadedAccounts = await Promise.all(loading);
    console.log(`⏱  ${this.name} - data loaded and start processing data`);

    const decoding = loadedAccounts.map(async (accounts, index) => {
      const program = this.programs[index];
      await createPipelineExecutor(accounts.values(), program.process, {
        jobsCount: 2,
        name: `⛏  ${this.name} - data`,
      });
    });
    await Promise.all(decoding);
    console.log(`⏱  ${this.name} - start processing metadata`);

    // processing metadata
    await createPipelineExecutor(
      this.state.metadataByMint.values(),
      async (metadata) => {
        await StateProvider.metadataByMintUpdater(metadata, this.state);
      },
      {
        jobsCount: 3,
        name: `⛏  ${this.name} - metadata`,
      }
    );
  }

  private async loadProgramAccounts(program: IProgramConfig) {
    try {
      console.log(
        `🤞 ${this.name} - loading program accounts ${program.pubkey}`
      );
      const accounts = await getProgramAccounts(
        this.connection,
        program.pubkey
      );
      console.log(`🍀 ${this.name} - loaded ${program.pubkey}`);

      return accounts;
    } catch (e) {
      console.error(`🐛 ${this.name} - failed loaded ${program.pubkey}`);
      throw e;
    }
  }

  private subscribeOnChange(program: IProgramConfig) {
    this.connection.onProgramAccountChange(
      toPublicKey(program.pubkey),
      (block) => {
        const account: PublicKeyStringAndAccount<Buffer> = {
          pubkey: pubkeyToString(block.accountId),
          account: block.accountInfo,
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
