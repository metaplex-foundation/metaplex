import { decodeEntity } from '../../BaseEntity';
import { Metadata } from '../entities';
import { METADATA_SCHEMA } from '../schema';

export const decodeMetadata = decodeEntity(Metadata, METADATA_SCHEMA);
