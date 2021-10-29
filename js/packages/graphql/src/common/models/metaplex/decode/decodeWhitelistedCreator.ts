import { WhitelistedCreator } from '../entities';
import { SCHEMA } from '../schema';
import { decodeEntity } from '../../BaseEntity';

export const decodeWhitelistedCreator = decodeEntity(
  WhitelistedCreator,
  SCHEMA,
);
