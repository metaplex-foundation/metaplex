import { config } from 'dotenv';
import { MongoAdapter } from '../adapters/mongo';
import { Ingester } from '../ingester';

const main = async () => {
  const adapter = new MongoAdapter();
  const ingester = new Ingester(adapter, adapter.endpoints);
  ingester.load();
};

config();
main();
