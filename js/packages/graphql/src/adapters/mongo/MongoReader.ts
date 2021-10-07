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
}
