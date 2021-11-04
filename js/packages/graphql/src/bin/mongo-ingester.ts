import { config } from 'dotenv';
import { MongoAdapter } from '../adapters/mongo';
import { extendBorsh } from '../common';
import { Ingester } from '../ingester';

extendBorsh(); // it's need for proper work of decoding

const main = async () => {
  // eslint-disable-next-line no-console
  console.time('ingester');
  const adapter = new MongoAdapter();
  const ingester = new Ingester(adapter, adapter.endpoints);
  await ingester.load();
  // eslint-disable-next-line no-console
  console.timeEnd('ingester');
};

config();
main();
