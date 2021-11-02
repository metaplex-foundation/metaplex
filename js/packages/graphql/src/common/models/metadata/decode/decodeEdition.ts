import { decodeEntity } from '../../BaseEntity';
import { Edition } from '../entities';
import { METADATA_SCHEMA } from '../schema';

export const decodeEdition = decodeEntity(Edition, METADATA_SCHEMA);
