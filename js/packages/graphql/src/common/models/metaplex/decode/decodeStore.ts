import { Store } from '../entities';
import { SCHEMA } from '../schema';
import { decodeEntity } from '../../BaseEntity';

export const decodeStore = decodeEntity(Store, SCHEMA);
