import { deserializeUnchecked } from "borsh";
import { Edition } from "../entities";
import { METADATA_SCHEMA } from "./schema";

export function decodeEdition(buffer: Buffer) {
  return deserializeUnchecked(METADATA_SCHEMA, Edition, buffer) as Edition;
}
