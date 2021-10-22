import { loadCreators } from "./loadCreators";
import { createMongoClient } from "../../db/mongo-utils";
import { createDevNetConnection } from "../connection";
import { toPublicKey } from "../ids";
import { loadMetadata } from "./loadMetadata";

export const loadMetaplexData = async () => {
    const connection = createDevNetConnection();
    const dbClient = await createMongoClient();
    await loadCreators('FvaXgXf5mVmEDQvD9Vt7VqFgctpYFj6ZyBPWcTF2jj7a', connection, dbClient);
    await loadMetadata('FvaXgXf5mVmEDQvD9Vt7VqFgctpYFj6ZyBPWcTF2jj7a', connection, dbClient);
  }
