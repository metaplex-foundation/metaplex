import { deserializeUnchecked } from "borsh";
import { WhitelistedCreator } from "./entities/WhitelistedCreator";
import { SCHEMA } from "./schema";

export function decodeWhitelistedCreator(buffer: Buffer) {
  return deserializeUnchecked(
    SCHEMA,
    WhitelistedCreator,
    buffer
  ) as WhitelistedCreator;
}
