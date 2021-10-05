import { deserializeUnchecked } from "borsh";
import { METADATA_REPLACE } from "./constants";
import { Metadata } from "../entities";
import { METADATA_SCHEMA } from "./schema";

export function decodeMetadata(buffer: Buffer): Metadata {
  const metadata = deserializeUnchecked(
    METADATA_SCHEMA,
    Metadata,
    buffer
  ) as Metadata;
  metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, "");
  metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, "");
  metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, "");
  return metadata;
}
