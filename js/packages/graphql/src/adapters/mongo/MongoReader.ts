import { Db } from "mongodb";
import { Reader } from "../../reader";
import { createConnection } from "../../utils/createConnection";
import { connectionString } from "./constants";
import { createOrm } from "./createOrm";

export class MongoReader extends Reader {
  private db!: Db;

  constructor(public networkName: string, endpoint: string) {
    super(createConnection(endpoint, "recent"));
  }

  async init() {
    this.db = await createOrm(connectionString, `metaplex-${this.networkName}`);
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

  async getStores() {
    return [];
  }
  async getStore() {
    return null;
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
