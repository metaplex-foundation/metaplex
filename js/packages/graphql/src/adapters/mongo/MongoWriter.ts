import { MetaMap, UpdateStateValueFunc } from "common";
import logger from "logger";
import { AnyBulkWriteOperation, Db } from "mongodb";
import { serialize } from "typescript-json-serializer";
import { WriterAdapter } from "../../ingester/";
import { connectionString } from "./constants";
import { createOrm } from "./createOrm";

export class MongoWriter implements WriterAdapter {
  private db!: Db;
  private cache: Partial<Record<keyof MetaMap, AnyBulkWriteOperation[]>> = {};

  public static async build(name: string) {
    const instance = new this(name);
    await instance.init();
    return instance;
  }

  constructor(private name: string) {}

  private async init() {
    this.db = await createOrm(connectionString, `metaplex-${this.name}`);
  }

  public persist: UpdateStateValueFunc = async (prop, key, value) => {
    const $set = serialize(value, true);
    const doc: AnyBulkWriteOperation = {
      updateOne: {
        filter: { _id: key },
        update: { $set },
        upsert: true,
      },
    };
    const docList = this.cache[prop] || (this.cache[prop] = []);
    docList.push(doc);
  };

  async flush() {
    const cache = this.cache;
    this.cache = {};

    for (const [prop, docs] of Object.entries(cache)) {
      await this.persistBatch(prop, docs);
    }
  }

  async persistBatch(collection: string, docs: AnyBulkWriteOperation[]) {
    if (!docs.length) {
      return;
    }
    try {
      await this.db.collection(collection).bulkWrite(docs);
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }
}
