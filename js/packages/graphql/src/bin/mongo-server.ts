import { startApolloServer } from "../server";
import { config } from "dotenv";
import { MetaplexDataSource } from "reader";
import { MongoAdapter } from "adapters/mongo/MongoAdapter";

const main = async () => {
  const adapter = new MongoAdapter();

  const api = new MetaplexDataSource(adapter);
  await startApolloServer(api);
};

config();
main();
