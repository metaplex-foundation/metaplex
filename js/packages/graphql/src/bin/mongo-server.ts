import { config } from 'dotenv';
import { MongoAdapter } from '../adapters/mongo';
import { MetaplexDataSource } from '../reader';
import { startApolloServer } from '../server';

const main = async () => {
  const adapter = new MongoAdapter();
  await adapter.init();
  adapter.initSubscription();
  const api = new MetaplexDataSource(adapter);
  await startApolloServer(api);
};

config();
main();
