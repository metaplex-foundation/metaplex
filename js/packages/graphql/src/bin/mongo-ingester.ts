import { MongoWriter } from "adapters/mongo/MongoWriter";
import { Ingester } from "ingester";
import { config } from "dotenv";

const main = async () => {
  const ingester = new Ingester(MongoWriter);

  ingester.load();
};

config();
main();
