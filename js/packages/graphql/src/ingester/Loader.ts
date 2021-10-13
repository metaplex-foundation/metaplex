import { Connection } from '@solana/web3.js';
import queue from 'queue';
import {
  AccountAndPubkey,
  extendBorsh,
  getProgramAccounts,
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

extendBorsh(); // it's need for proper work of decoding
export class Loader<TW extends IWriter = IWriter> {
  readonly connection: Connection;
  private defer: Promise<void> | undefined;
  private readonly changesQueue = queue({ autostart: false, concurrency: 1 });

  private readonly cache = {
    creators: new Map<string, WhitelistedCreator>(),
    stores: new Map<string, Store>(),
  } as const;

  private readonly writerAdapter: IWriter = {
    networkName: this.networkName,
    flush: () => this.writer.flush(),
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
    accounts: AccountAndPubkey[],
  ) {
    logger.info(
      `⛏ ${this.networkName} - start processing ${accounts.length} accounts for ${program.pubkey}`,
    );
    await createPipelineExecutor(accounts.values(), program.process, {
      jobsCount: 2,
      sequence: 1000,
      delay: () => this.writerAdapter.flush(),
    });

    if (this.cache.creators.size || this.cache.stores.size) {
      logger.info('⛏ links creators & stores');

      /*
      await Promise.all([
        this.reader
          .getCreatorIds()
          .then(ids => ids.forEach(id => this.cache.creators.delete(id))),
        this.reader
          .getStoreIds()
          .then(ids => ids.forEach(id => this.cache.stores.delete(id))),
      ]);
      */
      const creatorsAddressList = Array.from(this.cache.creators.values()).map(
        p => p.address,
      );
      const storeList = Array.from(this.cache.stores.keys());
      const metadata = await getWhitelistedCreatorList(
        creatorsAddressList,
        storeList,
      );

      metadata.forEach(item => {
        const storeId = item[0];
        const address = item[1];
        const creator = this.cache.creators.get(address);
        const store = this.cache.stores.get(storeId);
        if (creator && store) {
          if (!store.creatorIds.includes(creator.pubkey)) {
            store.creatorIds.push(creator.pubkey);
          }
          if (!creator.storeIds.includes(store.pubkey)) {
            creator.storeIds.push(store.pubkey);
          }
        }
      });
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
      `⛏ ${this.networkName} - accounts processed for ${program.pubkey}`,
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
