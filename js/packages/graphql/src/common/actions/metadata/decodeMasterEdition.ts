import { deserializeUnchecked } from "borsh";
import { MasterEditionV1, MasterEditionV2 } from "../entities";
import { MetadataKey } from "./MetadataKey";
import { METADATA_SCHEMA } from "./schema";

export function decodeMasterEdition(
  buffer: Buffer
): MasterEditionV1 | MasterEditionV2 {
  if (buffer[0] == MetadataKey.MasterEditionV1) {
    return deserializeUnchecked(
      METADATA_SCHEMA,
      MasterEditionV1,
      buffer
    ) as MasterEditionV1;
  } else {
    return deserializeUnchecked(
      METADATA_SCHEMA,
      MasterEditionV2,
      buffer
    ) as MasterEditionV2;
  }
}
