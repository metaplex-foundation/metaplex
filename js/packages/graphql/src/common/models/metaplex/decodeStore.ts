import { deserializeUnchecked } from "borsh";
import { Store } from "./entities/Store";
import { SCHEMA } from "./schema";

export function decodeStore(buffer: Buffer) {
  return deserializeUnchecked(SCHEMA, Store, buffer) as Store;
}
