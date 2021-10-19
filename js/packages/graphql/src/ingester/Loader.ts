import { Connection } from '@solana/web3.js';
import queue from 'queue';
import {
  AccountAndPubkey,
  extendBorsh,
  getProgramAccounts,
  Metadata,
  pubkeyToString,
  PublicKeyStringAndAccount,
  Store,
  toPublicKey,
  WhitelistedCreator,
} from '../common';
import logger from '../logger';
import { IDataAdapter } from '../adapters/IDataAdapter';
import { createPipelineExecutor } from '../utils/createPipelineExecutor';
import { PROGRAMS } from './constants';
import { ProgramParse, IWriter } from './types';
import { Reader } from '../reader';
import { getWhitelistedCreatorList } from '../../ingester/index';
import { JSONLazyResponse } from '../utils/JSONLazyResponse';

extendBorsh(); // it's need for proper work of decoding
export class Loader<TW extends IWriter = IWriter> {
  readonly connection: Connection;
  private defer: Promise<void> | undefined;
  private readonly changesQueue = queue({ autostart: false, concurrency: 1 });

  private readonly cache = {
    creators: new Map<string, WhitelistedCreator>(),
    stores: new Map<string, Store>(),
    metadata: new Map<string, Metadata>(),
  } as const;

  private readonly writerAdapter: IWriter = {
    networkName: this.networkName,
    flush: async () => {
      if (this.cache.metadata.size) {
        await Metadata.initBatch(this.cache.metadata.values());
        this.cache.metadata.forEach((m, key) => {
          this.writer.persist('metadata', key, m);
        });
        this.cache.metadata.clear();
      }
      return await this.writer.flush();
    },
    init: () => this.writer.init(),
    listenModeOn: () => this.writer.listenModeOn(),
    persist: (prop, key, value) => {
      const kprop = prop as keyof typeof this.cache;
      if (this.cache[kprop]) {
        this.cache[kprop].set(key, value as any);
        return Promise.resolve();
      } else {
        return this.writer.persist(prop, key, value);
      }
    },
  };

  private readonly writer: TW;
  private readonly reader: Reader;

  constructor(
    public readonly networkName: string,
    readonly adapter: IDataAdapter<TW, Reader>,
  ) {
    this.connection = adapter.getConnection(networkName);
    this.writer = adapter.getWriter(networkName);
    this.reader = adapter.getReader(networkName);
  }

  readonly programs: ProgramParse[] = PROGRAMS.map(({ pubkey, process }) => ({
    pubkey,
    process: account => process(account, this.writerAdapter.persist),
  }));

  async load() {
    if (!this.defer) {
      this.defer = this.createDefer();
    }
    await this.defer;
  }

  private async createDefer() {
    try {
      await this.loadAndProcessData();
      // process emitted messages
      this.writerAdapter.listenModeOn();
      this.changesQueue.autostart = true;
      this.changesQueue.start();
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  private async loadAndProcessData() {
    logger.info(`⏱  ${this.networkName} - start loading data`);
    for (const program of this.programs) {
      this.subscribeOnChange(program);
      const accounts = await this.loadProgramAccounts(program);
      await this.processProgramAccounts(program, accounts);
    }
    logger.info(`🏝️  ${this.networkName} - data loaded and processed`);
  }

  private async loadProgramAccounts(program: ProgramParse) {
    try {
      logger.info(
        `🤞 ${this.networkName} - loading program accounts ${program.pubkey}`,
      );
      const accounts = await getProgramAccounts(
        this.connection,
        program.pubkey,
      );
      logger.info(`🍀 ${this.networkName} - loaded ${program.pubkey}`);

      return accounts;
    } catch (e) {
      logger.error(`🐛 ${this.networkName} - failed loaded ${program.pubkey}`);
      throw e;
    }
  }

  private async processProgramAccounts(
    program: ProgramParse,
    accounts: JSONLazyResponse<AccountAndPubkey>,
  ) {
    logger.info(
      `⛏  ${this.networkName} - start processing accounts for ${program.pubkey}`,
    );
    await createPipelineExecutor(accounts.values(), program.process, {
      jobsCount: 2,
      sequence: 1000,
      delay: () => this.writerAdapter.flush(),
    });

    if (this.cache.creators.size || this.cache.stores.size) {
      logger.info('⛏  links creators & stores');

      const storeList = Array.from(this.cache.stores.keys());

      const sequence = 100;
      const creatorsAddressList = new Array<string>(sequence);
      let counter = 0;
      await createPipelineExecutor(
        this.cache.creators.values(),
        p => {
          creatorsAddressList[counter] = p.address;
          counter++;
        },
        {
          jobsCount: 1,
          sequence,
          delay: async () => {
            const creatorsList =
              counter < sequence
                ? creatorsAddressList.slice(0, counter)
                : creatorsAddressList;
            await getWhitelistedCreatorList(creatorsList, storeList).toStream(
              chunk => {
                const address: string = chunk[0];
                const storeId: string = chunk[4];
                const creator = this.cache.creators.get(address);
                const store = this.cache.stores.get(storeId);
                if (creator && store) {
                  if (!store.creatorIds.includes(creator.pubkey)) {
                    store.creatorIds.push(creator.pubkey);
                  }
                  if (creator.storeId) {
                    creator.storeId = storeId;
                  }
                }
              },
            );
            counter = 0;
          },
        },
      );

      this.cache.stores.forEach((store, storeId) => {
        this.writer.persist('stores', storeId, store);
      });
      this.cache.stores.clear();
      await this.writerAdapter.flush();

      this.cache.creators.forEach((creator, creatorId) => {
        this.writer.persist('creators', creatorId, creator);
      });
      this.cache.creators.clear();
      await this.writerAdapter.flush();
    }

    await this.writerAdapter.flush();
    logger.info(
      `⛏  ${this.networkName} - accounts processed for ${program.pubkey}`,
    );
  }

  private subscribeOnChange(program: ProgramParse) {
    if (process.env.DISABLE_SUBSCRIPTION)
      this.connection.onProgramAccountChange(
        toPublicKey(program.pubkey),
        block => {
          const account: PublicKeyStringAndAccount<Buffer> = {
            pubkey: pubkeyToString(block.accountId),
            account: {
              ...block.accountInfo,
              owner: pubkeyToString(block.accountInfo.owner),
            },
          };
          this.changesQueue.push(cb => {
            program.process(account);
            cb?.();
          });
        },
      );
  }
}
