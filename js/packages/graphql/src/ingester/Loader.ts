import { Connection } from "@solana/web3.js";
import queue from "queue";
import {
  AccountAndPubkey,
  extendBorsh,
  getProgramAccounts,
  pubkeyToString,
  PublicKeyStringAndAccount,
  toPublicKey,
} from "../common";
import logger from "../logger";
import { createConnection } from "../utils/createConnection";
import { createPipelineExecutor } from "../utils/createPipelineExecutor";
import { PROGRAMS } from "./constants";
import { ProgramParse, WriterAdapter } from "./types";

extendBorsh(); // it's need for proper work of decoding
export class Loader<T extends WriterAdapter = WriterAdapter> {
  readonly connection: Connection;
  private defer: Promise<void> | undefined;
  private readonly changesQueue = queue({ autostart: false, concurrency: 1 });

  constructor(
    public readonly networkName: string,
    endpoint: string,
    public readonly writer: T
  ) {
    this.connection = createConnection(endpoint, "recent");
  }

  readonly programs: ProgramParse[] = PROGRAMS.map(({ pubkey, process }) => ({
    pubkey,
    process: (account) => process(account, this.writer.persist),
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
      this.writer.listenModeOn();
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
        `🤞 ${this.networkName} - loading program accounts ${program.pubkey}`
      );
      const accounts = await getProgramAccounts(
        this.connection,
        program.pubkey
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
    accounts: AccountAndPubkey[]
  ) {
    logger.info(
      `⛏ ${this.networkName} - start processing ${accounts.length} accounts for ${program.pubkey}`
    );
    await createPipelineExecutor(accounts.values(), program.process, {
      jobsCount: 2,
      sequence: 1000,
      delay: () => this.writer.flush(),
    });
    await this.writer.flush();
    logger.info(
      `⛏ ${this.networkName} - accounts processed for ${program.pubkey}`
    );
  }

  private subscribeOnChange(program: ProgramParse) {
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
        this.changesQueue.push((cb) => {
          program.process(account);
          cb?.();
        });
      }
    );
  }
}
