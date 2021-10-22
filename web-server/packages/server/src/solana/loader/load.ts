import { loadCreators } from "./loadCreators";
import { createMongoClient } from "../../db/mongo-utils";
import { createDevNetConnection } from "../connection";
import { toPublicKey } from "../ids";

export const loadMetaplexData = async () => {
    const connection = createDevNetConnection();
    const dbClient = await createMongoClient();
    loadCreators('FvaXgXf5mVmEDQvD9Vt7VqFgctpYFj6ZyBPWcTF2jj7a', connection, dbClient);
  }
