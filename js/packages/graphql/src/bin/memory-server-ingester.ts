import { config } from 'dotenv';
import { MemoryAdapter } from '../adapters/memory';
import { Ingester } from '../ingester';
import { MetaplexDataSource } from '../reader';
import { startApolloServer } from '../server';

const main = async () => {
  const adapter = new MemoryAdapter();
  const ingester = new Ingester(adapter, adapter.endpoints);
  const api = new MetaplexDataSource(adapter);
  await startApolloServer(api);

  if (!process.env.DISABLE_MEM_WARMUP) {
    ingester.load();
  }
};

config();
main();
