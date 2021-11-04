import { config } from 'dotenv';
import { MemoryAdapter } from '../adapters/memory';
import { extendBorsh } from '../common';
import { Ingester } from '../ingester';
import { MetaplexDataSource } from '../reader';
import { startApolloServer } from '../server';

extendBorsh(); // it's need for proper work of decoding

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
