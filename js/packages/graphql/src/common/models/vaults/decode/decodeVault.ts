import { decodeEntity } from '../../BaseEntity';
import { Vault } from '../entities';
import { VAULT_SCHEMA } from '../schema';

export const decodeVault = decodeEntity(Vault, VAULT_SCHEMA);
