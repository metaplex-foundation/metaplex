import { config } from 'dotenv';
import { MemoryAdapter } from '../adapters/memory';
import { MetaplexDataSource } from '../reader';
import { getServer } from '../server';

const main = async () => {
  const adapter = new MemoryAdapter();
  const api = new MetaplexDataSource(adapter);
  await getServer(api);
};

config();
main();
