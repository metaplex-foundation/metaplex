import { config } from "dotenv";
import { MongoWriter } from "../adapters/mongo";
import { Ingester } from "../ingester";

const main = async () => {
  const ingester = new Ingester(MongoWriter);

  ingester.load();
};

config();
main();
