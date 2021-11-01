import { config } from 'dotenv';
import { MongoAdapter } from '../adapters/mongo';
import { extendBorsh } from '../common';
import { MetaplexDataSource } from '../reader';
import { startApolloServer } from '../server';

extendBorsh(); // it's need for proper work of decoding

const main = async () => {
  const adapter = new MongoAdapter();
  await adapter.init();
  adapter.initSubscription();
  const api = new MetaplexDataSource(adapter);
  await startApolloServer(api);
};

config();
main();
