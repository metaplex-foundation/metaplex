import { MemoryWriter } from "adapters/memory/MemoryWriter";
import { MemoryAdapter } from "adapters/memory/MemoryAdapter";
import { Ingester } from "ingester";
import { MetaplexDataSource } from "reader";
import { startApolloServer } from "server";
import { config } from "dotenv";

const main = async () => {
  const ingester = new Ingester(MemoryWriter);
  const adapter = new MemoryAdapter(ingester);

  const api = new MetaplexDataSource(adapter);
  await startApolloServer(api);

  if (!process.env.MEM_WARM_DISABLED) {
    ingester.load();
  }
};

config();
main();
