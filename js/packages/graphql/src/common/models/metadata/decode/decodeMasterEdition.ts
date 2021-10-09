import { MasterEditionV1, MasterEditionV2 } from '../entities';
import { MetadataKey } from '../MetadataKey';
import { METADATA_SCHEMA } from '../schema';

import { decodeEntity } from '../../BaseEntity';

const decodeMasterEditionV1 = decodeEntity(MasterEditionV1, METADATA_SCHEMA);
const decodeMasterEditionV2 = decodeEntity(MasterEditionV2, METADATA_SCHEMA);

export function decodeMasterEdition(
  buffer: Buffer,
  pubkey: string,
): MasterEditionV1 | MasterEditionV2 {
  return buffer[0] == MetadataKey.MasterEditionV1
    ? decodeMasterEditionV1(buffer, pubkey)
    : decodeMasterEditionV2(buffer, pubkey);
}
