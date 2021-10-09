import { decodeEntity } from '../../BaseEntity';
import { ExternalPriceAccount } from '../entities';
import { VAULT_SCHEMA } from '../schema';

export const decodeExternalPriceAccount = decodeEntity(
  ExternalPriceAccount,
  VAULT_SCHEMA,
);
