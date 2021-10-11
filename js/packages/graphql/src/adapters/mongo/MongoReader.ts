import { Db } from 'mongodb';
import { Reader } from '../../reader';
import { Connection } from '@solana/web3.js';

export class MongoReader extends Reader {
  private db!: Db;

  constructor(
    public networkName: string,
    connection: Connection,
    private initOrm: () => Promise<Db>,
  ) {
    super(connection);
  }

  async init() {
    this.db = await this.initOrm();
  }

  async storesCount() {
    return 0;
  }
  async creatorsCount() {
    return 0;
  }
  async artworksCount() {
    return 0;
  }
  async auctionsCount() {
    return 0;
  }

  async getStoreIds(): Promise<string[]> {
    return [];
  }

  async getStores() {
    return [];
  }
  async getStore() {
    return null;
  }

  async getCreatorIds(): Promise<string[]> {
    return [];
  }

  async getCreators() {
    return [];
  }
  async getCreator() {
    return null;
  }

  async getArtworks() {
    return [];
  }
  async getArtwork() {
    return null;
  }
  async getEdition() {
    return null;
  }
  async getMasterEdition() {
    return null;
  }
}
